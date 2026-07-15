import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { getActorId } from '../../api/crmClient';
import type { GateResult } from '../../lib/gates/types';
import type { BriefFormValues } from '../../lib/schema/campaign-brief';

const LEVEL_STYLES = {
  BLOCKING: { dot: 'bg-red-600', border: 'border-red-200', label: 'text-red-700' },
  WARNING: { dot: 'bg-amber-500', border: 'border-amber-200', label: 'text-amber-700' },
  INFO: { dot: 'bg-blue-500', border: 'border-blue-200', label: 'text-blue-700' },
} as const;

export function GateRow({
  gate,
  readOnly,
}: {
  gate: GateResult;
  readOnly?: boolean;
}) {
  const { setValue, control } = useFormContext<BriefFormValues>();
  const acknowledgments = useWatch({ control, name: 'acknowledgments' });
  const overrides = useWatch({ control, name: 'overrides' });
  const [showOverride, setShowOverride] = useState(false);

  const style = LEVEL_STYLES[gate.level];
  const acked = Boolean(acknowledgments?.[gate.id]);
  const override = overrides?.[gate.id];

  const acknowledge = (checked: boolean) => {
    const next = { ...(acknowledgments ?? {}) } as BriefFormValues['acknowledgments'];
    if (checked) {
      next[gate.id] = {
        at: new Date().toISOString(),
        actorId: getActorId() ?? 'unknown',
      };
    } else {
      delete next[gate.id];
    }
    setValue('acknowledgments', next, { shouldDirty: true });
  };

  return (
    <div className={`rounded-md border ${style.border} bg-white p-2`}>
      <div className="flex items-start gap-2">
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-semibold ${style.label}`}>
            {gate.title}
            <span className="ml-1 font-normal text-neutral-400">
              {gate.playbookRef}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-neutral-600">
            {gate.message}
          </p>

          {!readOnly && gate.level === 'WARNING' && (
            <label className="mt-1.5 flex items-center gap-1.5 text-[11px] text-neutral-600">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-amber-600"
                checked={acked}
                onChange={(event) => acknowledge(event.target.checked)}
              />
              Acknowledged
              {gate.fieldsSatisfied === false && (
                <span className="text-amber-700">
                  · companion fields still required
                </span>
              )}
            </label>
          )}

          {!readOnly && gate.level === 'BLOCKING' && gate.overridable && (
            <div className="mt-1.5">
              {override ? (
                <div className="rounded bg-neutral-50 p-1.5 text-[11px] text-neutral-600">
                  <span className="font-semibold text-neutral-700">
                    Overridden:
                  </span>{' '}
                  “{override.justification}”
                  <button
                    type="button"
                    className="ml-1.5 text-neutral-400 underline"
                    onClick={() => {
                      const next = { ...(overrides ?? {}) } as BriefFormValues['overrides'];
                      delete next[gate.id];
                      setValue('overrides', next, { shouldDirty: true });
                    }}
                  >
                    remove
                  </button>
                </div>
              ) : showOverride ? (
                <OverrideEditor
                  gateId={gate.id}
                  onDone={() => setShowOverride(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowOverride(true)}
                  className="rounded border border-red-300 px-2 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-50"
                >
                  Override…
                </button>
              )}
            </div>
          )}

          {gate.level === 'BLOCKING' && !gate.overridable && (
            <p className="mt-1 text-[11px] font-medium text-red-600">
              Cannot be overridden.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function OverrideEditor({
  gateId,
  onDone,
}: {
  gateId: string;
  onDone: () => void;
}) {
  const { setValue, getValues } = useFormContext<BriefFormValues>();
  const [justification, setJustification] = useState('');
  const valid = justification.trim().length >= 30;

  const save = () => {
    if (!valid) return;
    const next = { ...getValues('overrides') };
    next[gateId] = {
      justification: justification.trim(),
      actorId: getActorId() ?? 'unknown',
      at: new Date().toISOString(),
    };
    setValue('overrides', next, { shouldDirty: true });
    onDone();
  };

  return (
    <div className="rounded border border-red-200 bg-red-50/50 p-1.5">
      <textarea
        rows={2}
        autoFocus
        placeholder="Written justification (min 30 chars) — this is logged and exported with the brief."
        className="w-full rounded border border-neutral-200 px-2 py-1 text-[11px] outline-none focus:border-red-400"
        value={justification}
        onChange={(event) => setJustification(event.target.value)}
      />
      <div className="mt-1 flex items-center justify-between">
        <span
          className={`text-[10px] tabular-nums ${valid ? 'text-neutral-400' : 'text-red-500'}`}
        >
          {justification.trim().length}/30
        </span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onDone}
            className="text-[11px] text-neutral-400"
          >
            cancel
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={save}
            className="rounded bg-red-600 px-2 py-0.5 text-[11px] font-medium text-white disabled:opacity-40"
          >
            Log override
          </button>
        </div>
      </div>
    </div>
  );
}
