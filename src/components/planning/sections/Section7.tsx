import { useFieldArray, useFormContext } from 'react-hook-form';
import type { BriefFormValues } from '../../../lib/schema/campaign-brief';
import {
  AWARENESS_LEVELS,
  BRAND_ASSETS,
  PROOF_TYPES,
} from '../../../lib/schema/sections/s7-creative';
import { lintHook } from '../../../lib/gates/hook-linter';
import {
  MultiCheckField,
  SectionCard,
  SelectField,
  TextAreaField,
  TextField,
  YesNoField,
  inputClass,
} from '../fields';

const AWARENESS_LABELS: Record<(typeof AWARENESS_LEVELS)[number], string> = {
  UNAWARE: "Unaware — doesn't know they have the problem",
  PROBLEM_AWARE: 'Problem aware — feels the pain, no solution yet',
  SOLUTION_AWARE: 'Solution aware — knows the category, not you',
  PRODUCT_AWARE: 'Product aware — knows you, not convinced',
  MOST_AWARE: 'Most aware — needs a reason to act now',
};

const PROOF_LABELS: Record<(typeof PROOF_TYPES)[number], string> = {
  DEMONSTRATION: 'Demonstration',
  MECHANISM_SCIENCE: 'Mechanism / science',
  EXPERT_AUTHORITY: 'Expert authority',
  SOCIAL_PROOF: 'Social proof',
  BEFORE_AFTER: 'Before / after',
  GUARANTEE: 'Guarantee',
  DATA_STUDY: 'Data / study',
  NONE: 'None (flag it)',
};

const BRAND_ASSET_LABELS: Record<(typeof BRAND_ASSETS)[number], string> = {
  LOGO: 'Logo',
  COLORWAY: 'Colorway',
  SONIC: 'Sonic cue',
  CHARACTER: 'Character',
  PACKAGING: 'Packaging',
  SPOKESPERSON: 'Spokesperson',
};

export function Section7() {
  return (
    <SectionCard
      id="s7"
      number="7"
      title="Creative Strategy & Brief"
      subtitle="This is where the leverage is — creative quality is the biggest performance driver you control. ch. 8"
    >
      <SelectField
        name="s7.awarenessLevel"
        label="Audience awareness level"
        help="Product/Most-aware creative mines a small pool — that's where ceilings come from."
        options={AWARENESS_LEVELS.map((value) => ({
          value,
          label: AWARENESS_LABELS[value],
        }))}
      />
      <TextField
        name="s7.categoryEntryPoint"
        label="Category entry point"
        placeholder="The buying situation — e.g. 'skin flare-up before an event'"
      />
      <TextField
        name="s7.priorityCustomer"
        label="Priority customer"
        placeholder="Who exactly is this for?"
      />
      <PropositionField />
      <MultiCheckField
        name="s7.reasonsToBelieve"
        label="Reasons to believe (proof)"
        options={PROOF_TYPES.map((value) => ({ value, label: PROOF_LABELS[value] }))}
      />
      <TextAreaField
        name="s7.reasonsDetail"
        label="Proof detail"
        rows={2}
        placeholder="The specific study, review count, expert…"
      />
      <MultiCheckField
        name="s7.mandatoryBrandAssets"
        label="Mandatory brand assets"
        options={BRAND_ASSETS.map((value) => ({
          value,
          label: BRAND_ASSET_LABELS[value],
        }))}
      />
      <YesNoField
        name="s7.brandVisibleFirst2s"
        label="Brand visible in first 2 seconds?"
        help="Most viewers never pass 3 seconds — unbranded views are a donation to the category."
      />
      <HookVariants />
      <TextField name="s7.primaryCta" label="Primary CTA" placeholder="e.g. Shop now" />
      <TextField name="s7.destinationUrl" label="Destination URL" placeholder="https://…" />
      <TextField
        name="s7.utmParameters"
        label="UTM parameters"
        placeholder="utm_source=meta&utm_campaign=…"
      />
    </SectionCard>
  );
}

function PropositionField() {
  const { watch } = useFormContext<BriefFormValues>();
  const value = watch('s7.proposition') ?? '';
  const over = value.length > 140;
  return (
    <div className="sm:col-span-2">
      <TextAreaField
        name="s7.proposition"
        label="Proposition — one clear promise"
        rows={2}
        placeholder="If you can't say it in 140 characters, the ad can't either."
      />
      <span
        className={`-mt-1 block text-right text-[10px] tabular-nums ${
          over ? 'text-red-600' : 'text-neutral-400'
        }`}
      >
        {value.length}/140
      </span>
    </div>
  );
}

/** ≥3 hook variants at submit; the S9 policy linter flags risky phrasing inline. */
function HookVariants() {
  const { control, register, watch } = useFormContext<BriefFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 's7.hookVariants',
  });
  const texts = watch('s7.hookVariants');
  return (
    <div className="sm:col-span-2">
      <span className="mb-1 block text-xs font-medium text-neutral-600">
        Hook variants — minimum 3
        <span className="ml-2 font-normal text-neutral-400">
          the first 3 seconds decide everything else
        </span>
      </span>
      <div className="space-y-1.5">
        {fields.map((row, index) => {
          const keywords = lintHook(texts?.[index]?.text ?? '');
          return (
            <div key={row.id}>
              <div className="flex gap-1.5">
                <span className="flex w-6 items-center justify-center text-xs text-neutral-300">
                  {index + 1}
                </span>
                <input
                  placeholder="Hook text"
                  className={`${inputClass} flex-1`}
                  {...register(`s7.hookVariants.${index}.text`)}
                />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="rounded-md border border-neutral-200 px-2 text-neutral-400 hover:text-red-600"
                  title="Remove"
                >
                  ×
                </button>
              </div>
              {keywords.length > 0 && (
                <p className="ml-7 mt-0.5 text-[11px] text-amber-700">
                  ⚠ second-person + sensitive keyword ({keywords.join(', ')}) —
                  needs a human policy review in Section 9
                </p>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => append({ id: crypto.randomUUID(), text: '' })}
        className="mt-1.5 text-xs text-neutral-500 underline hover:text-neutral-700"
      >
        + add hook
      </button>
    </div>
  );
}
