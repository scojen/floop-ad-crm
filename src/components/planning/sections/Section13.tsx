import { useFormContext } from 'react-hook-form';
import type { BriefFormValues } from '../../../lib/schema/campaign-brief';
import { DateField, SectionCard, TextField } from '../fields';

export function Section13() {
  const { watch } = useFormContext<BriefFormValues>();
  const overrides = watch('overrides') ?? {};
  const overrideEntries = Object.entries(overrides);

  return (
    <SectionCard
      id="s13"
      number="13"
      title="Sign-off"
      subtitle="The overrides log below is part of the brief — it exports with it and is read at the post-mortem."
    >
      <TextField name="s13.mediaLead.name" label="Media lead — name" />
      <DateField name="s13.mediaLead.date" label="Media lead — date" />
      <TextField
        name="s13.clientApproval.name"
        label="Client approval — name (optional)"
      />
      <DateField name="s13.clientApproval.date" label="Client approval — date" />

      <div className="sm:col-span-2 mt-1 border-t border-neutral-100 pt-3">
        <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Overrides on record — {overrideEntries.length}
        </h4>
        {overrideEntries.length === 0 ? (
          <p className="text-xs text-neutral-400">
            No gates overridden. If that changes, each override and its
            justification will be listed here, in the export, and in the audit
            trail.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {overrideEntries.map(([gateId, override]) => (
              <li
                key={gateId}
                className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs"
              >
                <span className="font-mono font-medium text-amber-800">
                  {gateId}
                </span>
                <p className="mt-0.5 text-neutral-700">
                  {override.justification}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}
