import {
  useController,
  useFieldArray,
  useFormContext,
  useWatch,
  type Control,
} from 'react-hook-form';
import type { BriefFormValues } from '../../../lib/schema/campaign-brief';
import { requiredBuildFor } from '../../../lib/schema/sections/s0-client';
import type { DerivedCalcs } from '../../../lib/calc/derive';
import {
  CheckboxField,
  CurrencyOrPercentField,
  NumberField,
  SectionCard,
  TextAreaField,
  inputClass,
} from '../fields';

export function Section1({ calc }: { calc: DerivedCalcs | null }) {
  const { control } = useFormContext<BriefFormValues>();
  const vertical = useWatch({ control, name: 's0.vertical' });
  const businessModel = useWatch({ control, name: 's0.businessModel' });
  const build = requiredBuildFor(vertical);

  return (
    <SectionCard
      id="s1"
      number="1"
      title="Unit Economics"
      subtitle="Gross margin is not contribution margin. Include every cost that changes when you sell one more unit; exclude fixed costs. §2.1"
      badge={
        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
          BLOCKING GATE
        </span>
      }
    >
      {build === 'ecom' ? <EcomBuild /> : <LeadGenBuild />}

      <div className="sm:col-span-2 mt-1 border-t border-neutral-100 pt-3">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          1c · Targets
        </h4>
      </div>
      <NumberField
        name="s1.targets.requiredContributionAfterAds"
        label={
          build === 'ecom'
            ? 'Required contribution after ads (per order)'
            : 'Required contribution after ads (per raw lead)'
        }
        prefix="$"
      />

      <WhatIfPanel visible={build === 'ecom'} calc={calc} />

      {businessModel === 'SUBSCRIPTION' && <LtvBlock />}
    </SectionCard>
  );
}

function EcomBuild() {
  return (
    <>
      <div className="sm:col-span-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          1a · Contribution build (ecommerce)
        </h4>
      </div>
      <NumberField name="s1.ecom.aov" label="Gross order value (AOV)" prefix="$" />
      <CurrencyOrPercentField
        name="s1.ecom.promo"
        label="Avg promo / discount per order"
      />
      <NumberField name="s1.ecom.cogs" label="COGS" prefix="$" />
      <NumberField name="s1.ecom.fulfillment" label="Fulfillment & shipping" prefix="$" />
      <NumberField name="s1.ecom.paymentPct" label="Payment processing %" suffix="%" />
      <NumberField name="s1.ecom.paymentFixed" label="Payment fixed fee" prefix="$" />
      <NumberField
        name="s1.ecom.expectedReturnsPct"
        label="Expected returns / refunds"
        suffix="%"
      />
      <NumberField
        name="s1.ecom.returnsCostOverride"
        label="Returns cost override (optional)"
        prefix="$"
        help="Wins over the % when set."
      />
      <NumberField
        name="s1.ecom.variableCsPackaging"
        label="Variable CS / packaging"
        prefix="$"
      />
      <ExtraCostRows />
    </>
  );
}

function ExtraCostRows() {
  const { control, register } = useFormContext<BriefFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 's1.ecom.extraCosts',
  });
  return (
    <div className="sm:col-span-2">
      <span className="mb-1 block text-xs font-medium text-neutral-600">
        Chargebacks / other variable costs
      </span>
      <div className="space-y-1.5">
        {fields.map((row, index) => (
          <div key={row.id} className="flex gap-1.5">
            <input
              placeholder="Label"
              className={`${inputClass} flex-1`}
              {...register(`s1.ecom.extraCosts.${index}.label`)}
            />
            <ExtraCostAmount index={index} />
            <button
              type="button"
              onClick={() => remove(index)}
              className="rounded-md border border-neutral-200 px-2 text-neutral-400 hover:text-red-600"
              title="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          append({ id: crypto.randomUUID(), label: '', amount: null })
        }
        className="mt-1.5 text-xs text-neutral-500 underline hover:text-neutral-700"
      >
        + add cost row
      </button>
    </div>
  );
}

function ExtraCostAmount({ index }: { index: number }) {
  const { control } = useFormContext<BriefFormValues>();
  return (
    <div className="w-32">
      <NumberInputRaw name={`s1.ecom.extraCosts.${index}.amount`} control={control} />
    </div>
  );
}

function NumberInputRaw({
  name,
  control,
}: {
  name: `s1.ecom.extraCosts.${number}.amount`;
  control: Control<BriefFormValues>;
}) {
  const { field } = useController({ control, name });
  return (
    <input
      type="number"
      inputMode="decimal"
      step="any"
      placeholder="$"
      className={inputClass}
      value={field.value ?? ''}
      onChange={(event) =>
        field.onChange(event.target.value === '' ? null : Number(event.target.value))
      }
    />
  );
}

function LeadGenBuild() {
  return (
    <>
      <div className="sm:col-span-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          1b · Contribution build (lead gen / high-ticket)
        </h4>
      </div>
      <NumberField
        name="s1.leadGen.contributionPerClose"
        label="Expected COLLECTED contribution per closed deal"
        prefix="$"
        help="Collected, not signed. A signed case is not cash. §2.5"
      />
      <NumberField
        name="s1.leadGen.pQualGivenLeadPct"
        label="P(qualified | lead)"
        suffix="%"
      />
      <NumberField
        name="s1.leadGen.pApptGivenQualPct"
        label="P(appointment | qualified)"
        suffix="%"
      />
      <NumberField
        name="s1.leadGen.pCloseGivenApptPct"
        label="P(close | appointment)"
        suffix="%"
      />
    </>
  );
}

function LtvBlock() {
  return (
    <>
      <div className="sm:col-span-2 mt-1 border-t border-neutral-100 pt-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          1d · LTV & payback (required for subscription) §2.3–2.4
        </h4>
      </div>
      <NumberField
        name="s1.ltv.contributionPerMonth"
        label="Contribution per customer / month"
        prefix="$"
      />
      <RetentionField />
      <NumberField
        name="s1.ltv.discountRateAnnualPct"
        label="Discount rate (annual)"
        suffix="%"
      />
      <NumberField
        name="s1.ltv.plannedMonthlySpend"
        label="Planned monthly spend"
        prefix="$"
      />
      <CheckboxField
        name="s1.ltv.cashBufferConfirmed"
        label="Client has confirmed a cash buffer for the payback window"
        help="Required when payback exceeds 6 months — scaling stacks unrecouped cohorts. §2.4"
      />
      <TextAreaField
        name="s1.ltv.cashBufferNote"
        label="Cash buffer note"
        rows={2}
        minChars={undefined}
      />
    </>
  );
}

function RetentionField() {
  const { control } = useFormContext<BriefFormValues>();
  const mode = useController({ control, name: 's1.ltv.retention.mode' });
  const value = useController({ control, name: 's1.ltv.retention.value' });
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-neutral-600">
        Retention
      </span>
      <div className="flex">
        <input
          type="number"
          inputMode="decimal"
          step="any"
          className={`${inputClass} rounded-r-none`}
          value={value.field.value ?? ''}
          onChange={(event) =>
            value.field.onChange(
              event.target.value === '' ? null : Number(event.target.value),
            )
          }
        />
        <button
          type="button"
          onClick={() =>
            mode.field.onChange(
              mode.field.value === 'months' ? 'churnPct' : 'months',
            )
          }
          className="whitespace-nowrap rounded-r-md border border-l-0 border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-600"
        >
          {mode.field.value === 'months' ? 'months' : 'churn %/mo'}
        </button>
      </div>
    </div>
  );
}

/** The four levers (§2.1 remedies): live before/after break-even. */
function WhatIfPanel({
  visible,
  calc,
}: {
  visible: boolean;
  calc: DerivedCalcs | null;
}) {
  if (!visible) return null;
  const before = calc?.targets.breakEvenRoas ?? null;
  const after = calc?.whatIf?.targets.breakEvenRoas ?? null;
  return (
    <div className="sm:col-span-2 rounded-md border border-dashed border-neutral-300 bg-neutral-50/60 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          What-if levers — price / bundle / returns / freight
        </h4>
        <span className="text-xs tabular-nums text-neutral-600">
          break-even {before !== null ? `${before}x` : '—'}
          {after !== null && (
            <>
              {' → '}
              <span
                className={
                  before !== null && after < before
                    ? 'font-semibold text-green-700'
                    : 'font-semibold text-red-600'
                }
              >
                {after}x
              </span>
            </>
          )}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <NumberField name="s1.targets.whatIf.priceDelta" label="Price Δ" prefix="$" />
        <NumberField
          name="s1.targets.whatIf.returnRatePctOverride"
          label="Return rate →"
          suffix="%"
        />
        <NumberField name="s1.targets.whatIf.freightDelta" label="Freight Δ" prefix="$" />
        <BundleLever />
      </div>
    </div>
  );
}

function BundleLever() {
  const { control } = useFormContext<BriefFormValues>();
  const bundle = useController({ control, name: 's1.targets.whatIf.bundle' });
  const active = bundle.field.value !== null;
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-neutral-600">Bundle</span>
      {active ? (
        <div className="flex gap-1">
          <input
            type="number"
            step="any"
            title="AOV factor"
            placeholder="AOV×"
            className={inputClass}
            value={bundle.field.value?.aovFactor ?? ''}
            onChange={(event) =>
              bundle.field.onChange({
                aovFactor:
                  event.target.value === '' ? null : Number(event.target.value),
                cogsFactor: bundle.field.value?.cogsFactor ?? null,
              })
            }
          />
          <input
            type="number"
            step="any"
            title="COGS factor"
            placeholder="COGS×"
            className={inputClass}
            value={bundle.field.value?.cogsFactor ?? ''}
            onChange={(event) =>
              bundle.field.onChange({
                aovFactor: bundle.field.value?.aovFactor ?? null,
                cogsFactor:
                  event.target.value === '' ? null : Number(event.target.value),
              })
            }
          />
          <button
            type="button"
            className="text-neutral-400"
            title="Clear bundle"
            onClick={() => bundle.field.onChange(null)}
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() =>
            bundle.field.onChange({ aovFactor: null, cogsFactor: null })
          }
          className="w-full rounded-md border border-neutral-200 px-2 py-1.5 text-xs text-neutral-500 hover:border-neutral-400"
        >
          + try a bundle
        </button>
      )}
    </div>
  );
}
