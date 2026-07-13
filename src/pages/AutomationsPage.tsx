import { useState } from 'react';
import {
  useAutomationRules,
  useAutomationRuns,
  useCreateAutomationRule,
  useToggleAutomationRule,
} from '../api/queries';
import { timeAgo } from '../lib/time';
import type {
  AutomationActionType,
  AutomationRule,
  AutomationTriggerType,
} from '../types/v15';

const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  LEAD_CREATED: 'A new lead arrives',
  STAGE_CHANGED: 'A lead enters a stage',
  TIME_IN_STAGE_EXCEEDED: 'A lead sits in a stage too long',
  FORM_FIELD_EQUALS: 'A form answer equals a value',
};

const ACTION_LABELS: Record<AutomationActionType, string> = {
  ASSIGN_OWNER: 'Assign an owner',
  CREATE_TASK: 'Create a follow-up task',
  FIRE_CAPI_EVENT: 'Fire a CAPI event',
};

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'];

/** Single-condition "when X, do Y" rules — deliberately not a flow builder. */
export function AutomationsPage() {
  const rules = useAutomationRules();
  const [showForm, setShowForm] = useState(false);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);

  return (
    <div>
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            Automations
          </h2>
          <p className="text-sm text-neutral-500">
            When X happens, do Y. One condition, one action per rule.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          {showForm ? 'Cancel' : '+ New rule'}
        </button>
      </header>

      {showForm && <RuleForm onDone={() => setShowForm(false)} />}

      <div className="space-y-2">
        {rules.isLoading && (
          <p className="text-sm text-neutral-400">Loading rules…</p>
        )}
        {rules.data?.rules.length === 0 && !showForm && (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-white px-6 py-10 text-center text-sm text-neutral-400">
            No rules yet. Try "when a lead enters Qualified, create a
            follow-up task".
          </div>
        )}
        {rules.data?.rules.map((rule) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            expanded={expandedRuleId === rule.id}
            onToggleExpand={() =>
              setExpandedRuleId((current) =>
                current === rule.id ? null : rule.id,
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

function RuleCard({
  rule,
  expanded,
  onToggleExpand,
}: {
  rule: AutomationRule;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const toggleRule = useToggleAutomationRule();

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          role="switch"
          aria-checked={rule.isEnabled}
          onClick={() =>
            toggleRule.mutate({ ruleId: rule.id, isEnabled: !rule.isEnabled })
          }
          className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${
            rule.isEnabled ? 'bg-green-600' : 'bg-neutral-300'
          }`}
          title={rule.isEnabled ? 'Enabled' : 'Disabled'}
        >
          <span
            className={`block h-4 w-4 rounded-full bg-white transition-transform ${
              rule.isEnabled ? 'translate-x-4' : ''
            }`}
          />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-neutral-900">
            {rule.name}
          </div>
          <div className="truncate text-xs text-neutral-400">
            When {TRIGGER_LABELS[rule.triggerType].toLowerCase()}
            {describeConfig(rule.triggerConfig)} →{' '}
            {ACTION_LABELS[rule.actionType].toLowerCase()}
            {describeConfig(rule.actionConfig)}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleExpand}
          className="shrink-0 text-xs text-neutral-400 hover:text-neutral-600"
        >
          {expanded ? 'Hide runs' : 'Runs log'}
        </button>
      </div>
      {expanded && <RunsLog ruleId={rule.id} />}
    </div>
  );
}

function RunsLog({ ruleId }: { ruleId: string }) {
  const runs = useAutomationRuns(ruleId);
  return (
    <div className="border-t border-neutral-100 px-4 py-2">
      {runs.data?.runs.length === 0 && (
        <p className="py-2 text-xs text-neutral-400">
          This rule hasn't fired yet.
        </p>
      )}
      {runs.data?.runs.map((run) => (
        <div
          key={run.id}
          className="flex items-center justify-between py-1.5 text-xs"
        >
          <span
            className={
              run.status === 'SUCCESS'
                ? 'text-green-700'
                : run.status === 'SKIPPED'
                  ? 'text-neutral-400'
                  : 'text-red-600'
            }
          >
            {run.status.toLowerCase()}
            {run.errorMessage && ` — ${run.errorMessage}`}
          </span>
          <span className="text-neutral-400">
            {timeAgo(run.triggeredAt)} ago
          </span>
        </div>
      ))}
    </div>
  );
}

function RuleForm({ onDone }: { onDone: () => void }) {
  const createRule = useCreateAutomationRule();
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] =
    useState<AutomationTriggerType>('STAGE_CHANGED');
  const [stage, setStage] = useState('QUALIFIED');
  const [hours, setHours] = useState('48');
  const [field, setField] = useState('');
  const [value, setValue] = useState('');
  const [actionType, setActionType] =
    useState<AutomationActionType>('CREATE_TASK');
  const [taskTitle, setTaskTitle] = useState('');
  const [dueInHours, setDueInHours] = useState('24');
  const [eventName, setEventName] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    const triggerConfig: Record<string, unknown> = {};
    if (triggerType === 'STAGE_CHANGED') triggerConfig.stage = stage;
    if (triggerType === 'TIME_IN_STAGE_EXCEEDED') {
      triggerConfig.stage = stage;
      triggerConfig.hours = Number(hours);
    }
    if (triggerType === 'FORM_FIELD_EQUALS') {
      triggerConfig.field = field;
      triggerConfig.value = value;
    }

    const actionConfig: Record<string, unknown> = {};
    if (actionType === 'CREATE_TASK') {
      actionConfig.title = taskTitle;
      actionConfig.dueInHours = Number(dueInHours);
      actionConfig.assignToClaimant = true;
    }
    if (actionType === 'FIRE_CAPI_EVENT') actionConfig.eventName = eventName;
    if (actionType === 'ASSIGN_OWNER') actionConfig.userId = ownerId;

    createRule.mutate(
      { name, triggerType, triggerConfig, actionType, actionConfig },
      {
        onSuccess: onDone,
        onError: (mutationError) => setError(mutationError.message),
      },
    );
  };

  const inputClass =
    'w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-400';

  return (
    <div className="mb-4 rounded-lg border border-neutral-300 bg-white p-4">
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-xs text-neutral-500 md:col-span-2">
          Rule name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Follow up on qualified leads"
            className={`mt-1 ${inputClass}`}
          />
        </label>

        <div>
          <span className="text-xs text-neutral-500">When…</span>
          <select
            value={triggerType}
            onChange={(event) =>
              setTriggerType(event.target.value as AutomationTriggerType)
            }
            className={`mt-1 ${inputClass}`}
          >
            {(Object.keys(TRIGGER_LABELS) as AutomationTriggerType[]).map(
              (key) => (
                <option key={key} value={key}>
                  {TRIGGER_LABELS[key]}
                </option>
              ),
            )}
          </select>
          {(triggerType === 'STAGE_CHANGED' ||
            triggerType === 'TIME_IN_STAGE_EXCEEDED') && (
            <select
              value={stage}
              onChange={(event) => setStage(event.target.value)}
              className={`mt-2 ${inputClass}`}
            >
              {STAGES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
          {triggerType === 'TIME_IN_STAGE_EXCEEDED' && (
            <input
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              placeholder="Hours in stage"
              className={`mt-2 ${inputClass}`}
            />
          )}
          {triggerType === 'FORM_FIELD_EQUALS' && (
            <>
              <input
                value={field}
                onChange={(event) => setField(event.target.value)}
                placeholder="Form field name (e.g. budget)"
                className={`mt-2 ${inputClass}`}
              />
              <input
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Equals value"
                className={`mt-2 ${inputClass}`}
              />
            </>
          )}
        </div>

        <div>
          <span className="text-xs text-neutral-500">…do</span>
          <select
            value={actionType}
            onChange={(event) =>
              setActionType(event.target.value as AutomationActionType)
            }
            className={`mt-1 ${inputClass}`}
          >
            {(Object.keys(ACTION_LABELS) as AutomationActionType[]).map(
              (key) => (
                <option key={key} value={key}>
                  {ACTION_LABELS[key]}
                </option>
              ),
            )}
          </select>
          {actionType === 'CREATE_TASK' && (
            <>
              <input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Task title"
                className={`mt-2 ${inputClass}`}
              />
              <input
                value={dueInHours}
                onChange={(event) => setDueInHours(event.target.value)}
                placeholder="Due in hours"
                className={`mt-2 ${inputClass}`}
              />
            </>
          )}
          {actionType === 'FIRE_CAPI_EVENT' && (
            <input
              value={eventName}
              onChange={(event) => setEventName(event.target.value)}
              placeholder="Event name (e.g. lead_qualified)"
              className={`mt-2 ${inputClass}`}
            />
          )}
          {actionType === 'ASSIGN_OWNER' && (
            <input
              value={ownerId}
              onChange={(event) => setOwnerId(event.target.value)}
              placeholder="CRM user id (uuid)"
              className={`mt-2 ${inputClass}`}
            />
          )}
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={!name.trim() || createRule.isPending}
          onClick={submit}
          className="rounded-md bg-neutral-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
        >
          Create rule
        </button>
      </div>
    </div>
  );
}

function describeConfig(config: Record<string, unknown>): string {
  const entries = Object.entries(config).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  if (entries.length === 0) return '';
  return ` (${entries.map(([k, v]) => `${k}: ${String(v)}`).join(', ')})`;
}
