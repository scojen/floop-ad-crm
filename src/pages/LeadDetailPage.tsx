import { useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  useActivities,
  useClaimLead,
  useLead,
  useLogActivity,
  useReleaseLead,
  useSetOutcome,
} from '../api/queries';
import { initials } from '../lib/initials';
import { timeAgo } from '../lib/time';
import type { LeadOutcome } from '../types/leads';
import type { Activity, ActivityType } from '../types/pipeline';

export function LeadDetailPage() {
  const { leadId = '' } = useParams();
  const lead = useLead(leadId);
  const [notice, setNotice] = useState<string | null>(null);

  if (lead.isLoading) {
    return <p className="text-sm text-neutral-400">Loading lead…</p>;
  }
  if (lead.isError || !lead.data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Couldn't load this lead{lead.error ? `: ${lead.error.message}` : ''}.{' '}
        <Link to="/inbox" className="underline">
          Back to inbox
        </Link>
      </div>
    );
  }
  const data = lead.data;

  return (
    <div>
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">
          {data.fullName ?? 'Unknown'} — Lead Detail
        </h2>
        <p className="text-sm text-neutral-500">
          {data.triageStatus === 'ACCEPTED'
            ? `Pipeline: ${data.pipelineStage ?? '—'}`
            : `Triage: ${data.triageStatus.toLowerCase()}`}
          {' · '}submitted {timeAgo(data.submittedAt)} ago
        </p>
      </header>

      {notice && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          {notice}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="w-full shrink-0 space-y-4 lg:w-72">
          <Panel title="Source attribution">
            <FieldRow k="Campaign" v={data.campaignName} />
            <FieldRow k="Ad set" v={data.adsetName} />
            <FieldRow k="Ad" v={data.adName} />
            <FieldRow k="Platform" v={data.platform} />
            <FieldRow k="Form" v={data.externalFormId} mono />
            <FieldRow k="Lead id" v={data.externalLeadId} mono />
          </Panel>

          <Panel title="Contact">
            <FieldRow k="Email" v={data.email} />
            <FieldRow k="Phone" v={data.phone} />
            <ClaimRow
              leadId={data.id}
              claimedBy={data.claimedBy}
              onError={setNotice}
            />
          </Panel>

          {data.formAnswers.length > 0 && (
            <Panel title="Form answers">
              {data.formAnswers.map((answer) => (
                <FieldRow
                  key={answer.name}
                  k={answer.name.replaceAll('_', ' ')}
                  v={answer.values.join(', ')}
                />
              ))}
            </Panel>
          )}

          <OutcomePanel
            leadId={data.id}
            outcome={data.outcome}
            onError={setNotice}
          />
        </div>

        <div className="min-w-0 flex-1">
          <Timeline leadId={data.id} onError={setNotice} />
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
        {title}
      </h3>
      <div className="divide-y divide-neutral-100">{children}</div>
    </section>
  );
}

function FieldRow({
  k,
  v,
  mono,
}: {
  k: string;
  v: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="capitalize text-neutral-400">{k}</span>
      <span
        className={`truncate text-right text-neutral-800 ${mono ? 'font-mono text-xs' : ''}`}
      >
        {v ?? '—'}
      </span>
    </div>
  );
}

function ClaimRow({
  leadId,
  claimedBy,
  onError,
}: {
  leadId: string;
  claimedBy: { id: string; displayName: string; avatarColor: string | null } | null;
  onError: (message: string) => void;
}) {
  const claimLead = useClaimLead();
  const releaseLead = useReleaseLead();

  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-neutral-400">Claimed by</span>
      {claimedBy ? (
        <span className="flex items-center gap-1.5">
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold text-white"
            style={{ backgroundColor: claimedBy.avatarColor ?? '#6b7280' }}
          >
            {initials(claimedBy.displayName)}
          </span>
          <span className="text-neutral-800">{claimedBy.displayName}</span>
          <button
            type="button"
            onClick={() =>
              releaseLead.mutate(
                { leadId },
                { onError: (error) => onError(error.message) },
              )
            }
            className="ml-1 text-xs text-neutral-400 underline hover:text-neutral-600"
          >
            release
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() =>
            claimLead.mutate(
              { leadId },
              { onError: (error) => onError(error.message) },
            )
          }
          className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
        >
          Claim
        </button>
      )}
    </div>
  );
}

const OUTCOME_LABELS: Record<Exclude<LeadOutcome, 'NONE'>, string> = {
  QUALIFIED: 'Mark qualified',
  NOT_A_FIT: 'Not a fit',
  WON: 'Won',
  LOST: 'Lost',
};

function OutcomePanel({
  leadId,
  outcome,
  onError,
}: {
  leadId: string;
  outcome: LeadOutcome;
  onError: (message: string) => void;
}) {
  const setOutcome = useSetOutcome();

  const act = (value: LeadOutcome) =>
    setOutcome.mutate(
      { leadId, outcome: value },
      { onError: (error) => onError(error.message) },
    );

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
        Outcome
      </h3>
      {outcome !== 'NONE' && (
        <p className="mb-2 text-sm font-medium text-neutral-800">
          Current: {outcome.replaceAll('_', ' ').toLowerCase()}
        </p>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          disabled={setOutcome.isPending}
          onClick={() => act('QUALIFIED')}
          className="rounded-md border border-green-600 px-2 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
        >
          {OUTCOME_LABELS.QUALIFIED}
        </button>
        <button
          type="button"
          disabled={setOutcome.isPending}
          onClick={() => act('NOT_A_FIT')}
          className="rounded-md border border-red-400 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {OUTCOME_LABELS.NOT_A_FIT}
        </button>
        <button
          type="button"
          disabled={setOutcome.isPending}
          onClick={() => act('WON')}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {OUTCOME_LABELS.WON}
        </button>
        <button
          type="button"
          disabled={setOutcome.isPending}
          onClick={() => act('LOST')}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {OUTCOME_LABELS.LOST}
        </button>
      </div>
      <p className="mt-2 text-[11px] italic text-neutral-400">
        This action feeds back into Meta ad delivery via the Conversions API.
      </p>
    </section>
  );
}

const ACTIVITY_ICONS: Record<string, string> = {
  NOTE: '✎',
  CALL: '☎',
  SMS: '✉',
  EMAIL: '✉',
  STAGE_CHANGE: '⇢',
  CLAIM: 'C',
  RELEASE: 'R',
  TRIAGE: '✓',
  OUTCOME: '★',
  TASK: '☐',
  AUTOMATION: '⚙',
  SYSTEM: '●',
};

function Timeline({
  leadId,
  onError,
}: {
  leadId: string;
  onError: (message: string) => void;
}) {
  const activities = useActivities(leadId);
  const logActivity = useLogActivity();
  const [type, setType] = useState<ActivityType>('NOTE');
  const [body, setBody] = useState('');

  const submit = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    logActivity.mutate(
      { leadId, type, body: trimmed },
      {
        onSuccess: () => setBody(''),
        onError: (error) => onError(error.message),
      },
    );
  };

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
        Activity timeline
      </h3>

      <div className="mb-4 rounded-md border border-neutral-200 p-2.5">
        <div className="flex gap-1.5">
          {(['NOTE', 'CALL', 'SMS', 'EMAIL'] as ActivityType[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={`rounded px-2 py-0.5 text-[11px] ${
                type === value
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-500 hover:bg-neutral-100'
              }`}
            >
              {value.toLowerCase()}
            </button>
          ))}
        </div>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              submit();
            }
          }}
          placeholder="Log a call, note, or message… (Ctrl+Enter to save)"
          rows={2}
          maxLength={2000}
          className="mt-2 w-full resize-none border-0 p-0 text-sm outline-none placeholder:text-neutral-300"
        />
        <div className="flex justify-end">
          <button
            type="button"
            disabled={!body.trim() || logActivity.isPending}
            onClick={submit}
            className="rounded-md bg-neutral-800 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
          >
            Log
          </button>
        </div>
      </div>

      <div className="space-y-0 divide-y divide-neutral-100">
        {activities.data?.activities.length === 0 && (
          <p className="py-4 text-sm text-neutral-400">No activity yet.</p>
        )}
        {activities.data?.activities.map((activity) => (
          <TimelineItem key={activity.id} activity={activity} />
        ))}
      </div>
    </section>
  );
}

function TimelineItem({ activity }: { activity: Activity }) {
  return (
    <div className="flex gap-3 py-2.5">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-[10px] text-neutral-500">
        {ACTIVITY_ICONS[activity.type] ?? '·'}
      </span>
      <div className="min-w-0">
        <div className="text-sm text-neutral-800">
          {activity.body ?? activity.type.toLowerCase().replaceAll('_', ' ')}
        </div>
        <div className="text-[11px] text-neutral-400">
          {timeAgo(activity.occurredAt)} ago
          {activity.actor && ` · ${activity.actor.displayName}`}
          {!activity.actor && ' · system'}
        </div>
      </div>
    </div>
  );
}
