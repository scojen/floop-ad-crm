import {
  useController,
  useFieldArray,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import type { BriefFormValues } from '../../../lib/schema/campaign-brief';
import { SPECIAL_AD_CATEGORIES } from '../../../lib/schema/sections/s9-policy';
import { lintHook } from '../../../lib/gates/hook-linter';
import {
  CheckboxField,
  DateField,
  SectionCard,
  SelectField,
  TextField,
  inputClass,
} from '../fields';

const CATEGORY_LABELS: Record<(typeof SPECIAL_AD_CATEGORIES)[number], string> = {
  NONE: 'None',
  CREDIT_FINANCIAL: 'Credit / financial products',
  EMPLOYMENT: 'Employment',
  HOUSING: 'Housing',
  SOCIAL_ISSUES_ELECTIONS_POLITICS: 'Social issues / elections / politics',
};

export function Section9() {
  return (
    <SectionCard
      id="s9"
      number="9"
      title="Policy Pre-flight"
      subtitle="Classify on the OFFER, not the industry label — a dental practice advertising financing is running a credit ad. ch. 12"
      badge={
        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
          HARD STOP
        </span>
      }
    >
      <SelectField
        name="s9.specialAdCategory"
        label="Special Ad Category"
        help="Selecting one disables age/gender/radius targeting in Section 5."
        options={SPECIAL_AD_CATEGORIES.map((value) => ({
          value,
          label: CATEGORY_LABELS[value],
        }))}
      />
      <div className="hidden sm:block" />
      <HookReviewList />
      <ClaimsTable />
      <CheckboxField
        name="s9.restrictedContentChecked"
        label="Checked against restricted-content list (supplements before/after, weapons, adult, alcohol targeting…)"
      />
      <TextField name="s9.reviewedBy" label="Policy review by" />
      <DateField name="s9.reviewedOn" label="Reviewed on" />
    </SectionCard>
  );
}

/**
 * One review row per hook from S7. The linter is a heuristic aid — the rule
 * is contextual ("Are you diabetic?" vs "Diabetes management, simplified"),
 * so a HUMAN confirms each hook regardless of flags.
 */
function HookReviewList() {
  const { control } = useFormContext<BriefFormValues>();
  const hooks = useWatch({ control, name: 's7.hookVariants' }) ?? [];
  const reviews = useController({ control, name: 's9.hookReviews' });
  const entries = reviews.field.value ?? [];

  const confirmedFor = (hookId: string) =>
    entries.find((entry) => entry.hookId === hookId)?.confirmed ?? false;
  const toggle = (hookId: string) => {
    const existing = entries.find((entry) => entry.hookId === hookId);
    reviews.field.onChange(
      existing
        ? entries.map((entry) =>
            entry.hookId === hookId
              ? { ...entry, confirmed: !entry.confirmed }
              : entry,
          )
        : [...entries, { hookId, confirmed: true }],
    );
  };

  return (
    <div className="sm:col-span-2">
      <span className="mb-1 block text-xs font-medium text-neutral-600">
        Personal-attributes review — every hook, human-confirmed
      </span>
      {hooks.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-300 px-3 py-3 text-center text-xs text-neutral-400">
          No hooks written yet (Section 7).
        </p>
      ) : (
        <div className="space-y-1">
          {hooks.map((hook) => {
            const keywords = lintHook(hook.text ?? '');
            return (
              <label
                key={hook.id}
                className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                  keywords.length > 0
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-neutral-200'
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-neutral-700"
                  checked={confirmedFor(hook.id)}
                  onChange={() => toggle(hook.id)}
                />
                <span className="min-w-0">
                  <span className="block truncate text-neutral-800">
                    {hook.text || <em className="text-neutral-400">empty hook</em>}
                  </span>
                  {keywords.length > 0 && (
                    <span className="block text-[11px] text-amber-700">
                      ⚠ flagged: {keywords.join(', ')} — confirm it describes the
                      topic, not the person
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClaimsTable() {
  const { control, register } = useFormContext<BriefFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 's9.claims' });
  return (
    <div className="sm:col-span-2">
      <span className="mb-1 block text-xs font-medium text-neutral-600">
        Claims substantiation — every factual claim needs evidence on file
      </span>
      <div className="space-y-1.5">
        {fields.map((row, index) => (
          <div key={row.id} className="flex flex-wrap gap-1.5 sm:flex-nowrap">
            <input
              placeholder='Claim — e.g. "92% saw improvement"'
              className={`${inputClass} flex-1`}
              {...register(`s9.claims.${index}.claimText`)}
            />
            <input
              placeholder="Evidence ref"
              className={`${inputClass} sm:w-40`}
              {...register(`s9.claims.${index}.evidenceRef`)}
            />
            <input
              placeholder="Reviewed by"
              className={`${inputClass} sm:w-28`}
              {...register(`s9.claims.${index}.reviewedBy`)}
            />
            <button
              type="button"
              onClick={() => remove(index)}
              className="rounded-md border border-neutral-200 px-2 text-neutral-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          append({
            id: crypto.randomUUID(),
            claimText: '',
            evidenceRef: '',
            reviewedBy: '',
            reviewedOn: null,
          })
        }
        className="mt-1.5 text-xs text-neutral-500 underline hover:text-neutral-700"
      >
        + add claim
      </button>
    </div>
  );
}
