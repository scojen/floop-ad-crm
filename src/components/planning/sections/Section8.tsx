import { useFieldArray, useFormContext } from 'react-hook-form';
import type { FieldPath } from 'react-hook-form';
import type { BriefFormValues } from '../../../lib/schema/campaign-brief';
import {
  ASPECT_RATIOS,
  ASSET_PROOF_TYPES,
  CREATIVE_CTAS,
  CREATIVE_FORMATS,
  FIRST_FRAME_CONTENT,
  HOOK_TYPES,
  LENGTH_BUCKETS,
  OFFER_SHOWN,
  TAG_SCHEMA_VERSION,
  TALENT_AGE_BANDS,
  TEST_ROLES,
  emptyCreativeAsset,
} from '../../../lib/schema/sections/s8-assets';
import { AWARENESS_LEVELS } from '../../../lib/schema/sections/s7-creative';
import { MultiCheckField, SectionCard, YesNoField, inputClass } from '../fields';

const label = (value: string) =>
  value.replace(/_/g, ' ').toLowerCase().replace('lt 15s', '< 15s').replace('gt 60s', '> 60s');

export function Section8() {
  const { control } = useFormContext<BriefFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 's8.assets' });

  return (
    <SectionCard
      id="s8"
      number="8"
      title="Creative Assets & Tagging"
      subtitle={`Every asset fully tagged (tag schema v${TAG_SCHEMA_VERSION}) — this section builds the dataset your creative analysis runs on. Untagged spend is unlearnable spend. ch. 8`}
      badge={
        <span className="rounded-full border border-neutral-300 bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
          ⭐ DATASET
        </span>
      }
    >
      <div className="sm:col-span-2 space-y-3">
        {fields.length === 0 && (
          <p className="rounded-md border border-dashed border-neutral-300 px-3 py-4 text-center text-xs text-neutral-400">
            No assets yet. Each ad creative gets a row with a stable ID and a
            complete tag set.
          </p>
        )}
        {fields.map((row, index) => (
          <AssetCard key={row.id} index={index} onRemove={() => remove(index)} />
        ))}
        <button
          type="button"
          onClick={() => append(emptyCreativeAsset(crypto.randomUUID()))}
          className="text-xs text-neutral-500 underline hover:text-neutral-700"
        >
          + add creative asset
        </button>
      </div>
    </SectionCard>
  );
}

function AssetCard({ index, onRemove }: { index: number; onRemove: () => void }) {
  const { register, watch } = useFormContext<BriefFormValues>();
  const creativeId = watch(`s8.assets.${index}.creativeId`);

  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-neutral-400">
          {creativeId?.slice(0, 8)}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-neutral-400 hover:text-red-600"
        >
          remove
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          placeholder="Asset URL / asset-manager ID"
          className={`${inputClass} sm:col-span-2`}
          {...register(`s8.assets.${index}.assetRef`)}
        />
        <input
          placeholder="Concept ID (angle)"
          title="Assets sharing an angle share a concept ID — <3 live concepts is a single point of failure"
          className={inputClass}
          {...register(`s8.assets.${index}.conceptId`)}
        />
        <TagSelect name={`s8.assets.${index}.tags.awarenessLevel`} placeholder="Awareness level…" values={AWARENESS_LEVELS} />
        <TagSelect name={`s8.assets.${index}.tags.format`} placeholder="Format…" values={CREATIVE_FORMATS} />
        <TagSelect name={`s8.assets.${index}.tags.hookType`} placeholder="Hook type…" values={HOOK_TYPES} />
        <TagSelect name={`s8.assets.${index}.tags.firstFrame`} placeholder="First frame…" values={FIRST_FRAME_CONTENT} />
        <TagSelect name={`s8.assets.${index}.tags.proofType`} placeholder="Proof type…" values={ASSET_PROOF_TYPES} />
        <TagSelect name={`s8.assets.${index}.tags.offerShown`} placeholder="Offer shown…" values={OFFER_SHOWN} />
        <TagSelect name={`s8.assets.${index}.tags.lengthBucket`} placeholder="Length…" values={LENGTH_BUCKETS} />
        <TagSelect name={`s8.assets.${index}.tags.cta`} placeholder="CTA…" values={CREATIVE_CTAS} />
        <TagSelect name={`s8.assets.${index}.tags.talentAgeBand`} placeholder="Talent age band…" values={TALENT_AGE_BANDS} />
        <input
          placeholder="Talent / creator ID"
          className={inputClass}
          {...register(`s8.assets.${index}.tags.talentCreatorId`)}
        />
        <input
          placeholder="Category entry point"
          className={inputClass}
          {...register(`s8.assets.${index}.tags.categoryEntryPoint`)}
        />
        <TagSelect name={`s8.assets.${index}.testRole`} placeholder="Test role…" values={TEST_ROLES} />
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <YesNoField
          name={`s8.assets.${index}.tags.brandIn2s`}
          label="Brand visible in first 2s?"
        />
        <YesNoField
          name={`s8.assets.${index}.tags.talentProfessional`}
          label="Professional talent?"
        />
      </div>
      <MultiCheckField
        name={`s8.assets.${index}.tags.aspectRatios`}
        label="Aspect ratios produced"
        options={ASPECT_RATIOS.map((value) => ({
          value,
          label: value.replace('_', ':'),
        }))}
      />
    </div>
  );
}

function TagSelect({
  name,
  placeholder,
  values,
}: {
  name: FieldPath<BriefFormValues>;
  placeholder: string;
  values: readonly string[];
}) {
  const { register } = useFormContext<BriefFormValues>();
  return (
    <select
      className={inputClass}
      {...register(name, {
        setValueAs: (value) => (value === '' ? null : value),
      })}
    >
      <option value="">{placeholder}</option>
      {values.map((value) => (
        <option key={value} value={value}>
          {label(value)}
        </option>
      ))}
    </select>
  );
}
