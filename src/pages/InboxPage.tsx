import { useMemo, useState } from 'react';
import {
  useAcceptLead,
  useBulkLeadAction,
  useClaimLead,
  useDiscardLead,
  useInboxLeads,
} from '../api/queries';
import { initials } from '../lib/initials';
import { ageSeverity, timeAgo } from '../lib/time';
import type { CrmLead, DiscardReason } from '../types/leads';
import { DiscardReason as Reasons } from '../types/leads';

interface DiscardTarget {
  kind: 'single' | 'bulk';
  leadIds: string[];
}

/**
 * Triage queue: shared, oldest-unclaimed-first. Speed is the point of
 * this screen — row actions everywhere, bulk bar for sweeps, quality
 * flags and SLA aging impossible to miss.
 */
export function InboxPage() {
  const inbox = useInboxLeads();
  const acceptLead = useAcceptLead();
  const discardLead = useDiscardLead();
  const claimLead = useClaimLead();
  const bulkAction = useBulkLeadAction();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [discardTarget, setDiscardTarget] = useState<DiscardTarget | null>(
    null,
  );
  const [notice, setNotice] = useState<string | null>(null);

  const leads = useMemo(() => inbox.data?.leads ?? [], [inbox.data]);
  const allSelected = leads.length > 0 && selected.size === leads.length;

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(leads.map((l) => l.id)));
  };

  const handleClaim = (lead: CrmLead) => {
    setNotice(null);
    claimLead.mutate(
      { leadId: lead.id },
      { onError: (error) => setNotice(error.message) },
    );
  };

  const handleAccept = (lead: CrmLead) => {
    setNotice(null);
    acceptLead.mutate(
      { leadId: lead.id },
      { onError: (error) => setNotice(error.message) },
    );
  };

  const submitDiscard = (reason: DiscardReason, note: string) => {
    if (!discardTarget) return;
    setNotice(null);
    if (discardTarget.kind === 'single') {
      discardLead.mutate(
        { leadId: discardTarget.leadIds[0], reason, note: note || undefined },
        { onError: (error) => setNotice(error.message) },
      );
    } else {
      bulkAction.mutate(
        {
          leadIds: discardTarget.leadIds,
          action: 'DISCARD',
          reason,
          note: note || undefined,
        },
        { onError: (error) => setNotice(error.message) },
      );
      setSelected(new Set());
    }
    setDiscardTarget(null);
  };

  const bulkAccept = () => {
    setNotice(null);
    bulkAction.mutate(
      { leadIds: [...selected], action: 'ACCEPT' },
      { onError: (error) => setNotice(error.message) },
    );
    setSelected(new Set());
  };

  return (
    <div>
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">
          Inbox — unworked leads
        </h2>
        <p className="text-sm text-neutral-500">
          Shared queue · oldest unclaimed first ·{' '}
          {inbox.data ? `${inbox.data.total} pending` : '…'}
        </p>
      </header>

      {notice && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          {notice}
        </div>
      )}
      {inbox.isError && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn't load the inbox: {inbox.error.message}
        </div>
      )}

      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm">
          <span className="font-medium text-neutral-700">
            {selected.size} selected
          </span>
          <button
            type="button"
            onClick={bulkAccept}
            className="rounded-md border border-green-600 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
          >
            Accept selected →
          </button>
          <button
            type="button"
            onClick={() =>
              setDiscardTarget({ kind: 'bulk', leadIds: [...selected] })
            }
            className="rounded-md border border-red-400 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Discard selected
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-neutral-400 hover:text-neutral-600"
          >
            Clear
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
              <th className="w-8 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="accent-neutral-700"
                />
              </th>
              <th className="px-3 py-2.5 font-medium">Lead</th>
              <th className="px-3 py-2.5 font-medium">Source</th>
              <th className="px-3 py-2.5 font-medium">Age</th>
              <th className="px-3 py-2.5 font-medium">Claim</th>
              <th className="px-3 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {inbox.isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">
                  Loading queue…
                </td>
              </tr>
            )}
            {inbox.data && leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">
                  Inbox zero — no unworked leads. New submissions land here
                  automatically via polling{' '}
                  <span className="text-neutral-300">(webhooks after App Review)</span>.
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <InboxRow
                key={lead.id}
                lead={lead}
                selected={selected.has(lead.id)}
                onToggle={() => toggle(lead.id)}
                onClaim={() => handleClaim(lead)}
                onAccept={() => handleAccept(lead)}
                onDiscard={() =>
                  setDiscardTarget({ kind: 'single', leadIds: [lead.id] })
                }
              />
            ))}
          </tbody>
        </table>
      </div>

      {discardTarget && (
        <DiscardDialog
          count={discardTarget.leadIds.length}
          onCancel={() => setDiscardTarget(null)}
          onConfirm={submitDiscard}
        />
      )}
    </div>
  );
}

function InboxRow({
  lead,
  selected,
  onToggle,
  onClaim,
  onAccept,
  onDiscard,
}: {
  lead: CrmLead;
  selected: boolean;
  onToggle: () => void;
  onClaim: () => void;
  onAccept: () => void;
  onDiscard: () => void;
}) {
  const severity = ageSeverity(lead.submittedAt);
  const preview =
    lead.email ??
    lead.phone ??
    lead.formAnswers[0]?.values[0] ??
    lead.externalLeadId;

  return (
    <tr className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50">
      <td className="px-3 py-2.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="accent-neutral-700"
        />
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2 font-medium text-neutral-900">
          {lead.fullName ?? 'Unknown'}
          {lead.qualityFlags.map((flag) => (
            <QualityFlag key={flag} flag={flag} />
          ))}
        </div>
        <div className="text-xs text-neutral-400">{preview}</div>
      </td>
      <td className="px-3 py-2.5">
        <span className="inline-block max-w-48 truncate rounded-full border border-neutral-200 px-2.5 py-0.5 text-[11px] text-neutral-600">
          {lead.campaignName ?? lead.adName ?? lead.platform}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <span
          className={`text-xs font-medium tabular-nums ${
            severity === 'late'
              ? 'text-red-600'
              : severity === 'warn'
                ? 'text-amber-600'
                : 'text-neutral-400'
          }`}
        >
          {timeAgo(lead.submittedAt)}
          {severity === 'late' && ' ⚠'}
        </span>
      </td>
      <td className="px-3 py-2.5">
        {lead.claimedBy ? (
          <span
            title={`Claimed by ${lead.claimedBy.displayName}`}
            className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white"
            style={{
              backgroundColor: lead.claimedBy.avatarColor ?? '#6b7280',
            }}
          >
            {initials(lead.claimedBy.displayName)}
          </span>
        ) : (
          <button
            type="button"
            onClick={onClaim}
            className="rounded-md border border-neutral-300 px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:border-neutral-400 hover:bg-neutral-50"
          >
            Claim
          </button>
        )}
      </td>
      <td className="px-3 py-2.5 text-right">
        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-md border border-neutral-200 px-2.5 py-1 text-[11px] text-neutral-500 hover:border-red-300 hover:text-red-600"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="rounded-md border border-green-600 px-2.5 py-1 text-[11px] font-medium text-green-700 hover:bg-green-50"
          >
            Accept →
          </button>
        </div>
      </td>
    </tr>
  );
}

function QualityFlag({ flag }: { flag: string }) {
  const labels: Record<string, string> = {
    placeholder_email: 'placeholder email?',
    invalid_phone: 'invalid phone?',
    duplicate_contact: 'possible dup',
  };
  return (
    <span className="rounded-full border border-amber-400 px-2 py-0.5 text-[10px] font-normal text-amber-700">
      {labels[flag] ?? flag}
    </span>
  );
}

const REASON_LABELS: Record<DiscardReason, string> = {
  JUNK: 'Junk / fake submission',
  DUPLICATE: 'Duplicate',
  SPAM: 'Spam',
  NOT_SERVICEABLE: 'Not serviceable',
  OTHER: 'Other',
};

function DiscardDialog({
  count,
  onCancel,
  onConfirm,
}: {
  count: number;
  onCancel: () => void;
  onConfirm: (reason: DiscardReason, note: string) => void;
}) {
  const [reason, setReason] = useState<DiscardReason>(Reasons.JUNK);
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6 shadow-lg">
        <h3 className="text-sm font-semibold text-neutral-900">
          Discard {count === 1 ? 'lead' : `${count} leads`}
        </h3>
        <p className="mt-1 text-xs text-neutral-500">
          The reason is recorded and will feed back into ad quality signals.
        </p>
        <div className="mt-4 space-y-1.5">
          {(Object.keys(REASON_LABELS) as DiscardReason[]).map((value) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700"
            >
              <input
                type="radio"
                name="discard-reason"
                checked={reason === value}
                onChange={() => setReason(value)}
                className="accent-neutral-700"
              />
              {REASON_LABELS[value]}
            </label>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional note"
          maxLength={500}
          rows={2}
          className="mt-3 w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-400"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason, note)}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
