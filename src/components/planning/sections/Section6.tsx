import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { BriefFormValues } from '../../../lib/schema/campaign-brief';
import {
  applyOfferImpact,
  computeEcomContribution,
  computeTargets,
} from '../../../lib/calc/economics';
import {
  economicShapeFor,
  engineFor,
} from '../../../lib/schema/sections/s0-client';
import { OFFER_RISKS, OFFER_TYPES } from '../../../lib/schema/sections/s6-offer';
import {
  CurrencyOrPercentField,
  DateField,
  MultiCheckField,
  NumberField,
  SectionCard,
  SelectField,
  TextAreaField,
} from '../fields';

const OFFER_TYPE_LABELS: Record<(typeof OFFER_TYPES)[number], string> = {
  NONE: 'No offer',
  PERCENTAGE_DISCOUNT: '% discount',
  FIXED_DISCOUNT: 'Fixed $ discount',
  GIFT_WITH_PURCHASE: 'Gift with purchase',
  FREE_TRIAL: 'Free trial',
  BUNDLE: 'Bundle',
  SUBSCRIPTION: 'Subscribe & save',
  FINANCING: 'Financing',
  GUARANTEE: 'Guarantee',
  FREE_CONSULTATION: 'Free consultation',
  OTHER: 'Other',
};

const OFFER_RISK_LABELS: Record<(typeof OFFER_RISKS)[number], string> = {
  MARGIN_LOSS: 'Margin loss',
  TRAINED_DISCOUNT_BEHAVIOR: 'Trains discount-waiting',
  ADVERSE_SELECTION: 'Adverse selection',
  RETURNS: 'Returns risk',
  CHURN: 'Trial churn',
  REGULATORY_DISCLOSURE: 'Disclosure required',
  INVENTORY: 'Inventory risk',
};

export function Section6() {
  const { control } = useFormContext<BriefFormValues>();
  const offerType = useWatch({ control, name: 's6.offerType' });
  const hasOffer = offerType !== null && offerType !== undefined && offerType !== 'NONE';
  const monetary =
    offerType === 'PERCENTAGE_DISCOUNT' ||
    offerType === 'FIXED_DISCOUNT' ||
    offerType === 'SUBSCRIPTION' ||
    offerType === 'BUNDLE' ||
    offerType === 'OTHER';

  return (
    <SectionCard
      id="s6"
      number="6"
      title="Offer"
      subtitle="An offer changes the Section 1 economics — the form recomputes them live below. §1.4"
    >
      <SelectField
        name="s6.offerType"
        label="Offer type"
        options={OFFER_TYPES.map((value) => ({
          value,
          label: OFFER_TYPE_LABELS[value],
        }))}
      />
      {hasOffer && (
        <>
          <DateField name="s6.endDate" label="Offer end date" help="Open-ended discounts train customers to never pay full price." />
          {monetary && (
            <CurrencyOrPercentField
              name="s6.discount"
              label="Discount per order"
            />
          )}
          {(offerType === 'GIFT_WITH_PURCHASE' || offerType === 'FREE_TRIAL') && (
            <NumberField
              name="s6.giftCostPerOrder"
              label="Variable cost of gift / trial (per order)"
              prefix="$"
            />
          )}
          <NumberField
            name="s6.expectedAovImpact"
            label="Expected AOV impact"
            prefix="$"
            help="Positive if the offer lifts basket size (bundles), negative if it shrinks it."
          />
          <TextAreaField name="s6.details" label="Offer details" rows={2} />
          <MultiCheckField
            name="s6.risks"
            label="Which risks does this offer carry? (check all that apply)"
            options={OFFER_RISKS.map((value) => ({
              value,
              label: OFFER_RISK_LABELS[value],
            }))}
          />
          <OfferImpactReadout />
        </>
      )}
    </SectionCard>
  );
}

/** The live before/after — the §1 economics with this offer applied. */
function OfferImpactReadout() {
  const { control } = useFormContext<BriefFormValues>();
  const vertical = useWatch({ control, name: 's0.vertical' });
  const businessModel = useWatch({ control, name: 's0.businessModel' });
  const ecom = useWatch({ control, name: 's1.ecom' });
  const required = useWatch({
    control,
    name: 's1.targets.requiredContributionAfterAds',
  });
  const discount = useWatch({ control, name: 's6.discount' });
  const giftCostPerOrder = useWatch({ control, name: 's6.giftCostPerOrder' });
  const expectedAovImpact = useWatch({ control, name: 's6.expectedAovImpact' });

  const derived = useMemo(() => {
    const shape = economicShapeFor(vertical, businessModel);
    if (engineFor(shape) !== 'linear') return null;
    // Mirror deriveCalcs: take rate participates only for the TAKE_RATE shape.
    const build =
      shape === 'TAKE_RATE' ? ecom : { ...ecom, takeRatePct: null };
    const contribution = computeEcomContribution(build);
    const targets = computeTargets({
      grossOrderValue: build.aov,
      netRevenue: contribution.netRevenue,
      contributionBeforeAds: contribution.contribution,
      requiredContributionAfterAds: required,
    });
    const offer = applyOfferImpact(
      build,
      { discount, giftCostPerOrder, expectedAovImpact },
      required,
    );
    return { contribution, targets, offer };
  }, [vertical, businessModel, ecom, required, discount, giftCostPerOrder, expectedAovImpact]);

  if (!derived) return null;
  const before = derived.targets.breakEvenRoas;
  const after = derived.offer?.targets.breakEvenRoas ?? null;
  const contributionBefore = derived.contribution.contribution;
  const contributionAfter = derived.offer?.contribution.contribution ?? null;
  const breaks = after !== null && after > 6 && (before === null || before <= 6);
  return (
    <div
      className={`sm:col-span-2 rounded-md border px-3 py-2 text-xs ${
        breaks
          ? 'border-red-300 bg-red-50 text-red-800'
          : 'border-neutral-200 bg-neutral-50 text-neutral-700'
      }`}
    >
      <span className="font-semibold">With this offer:</span>{' '}
      contribution {fmt(contributionBefore, '$')} → {fmt(contributionAfter, '$')} ·
      break-even ROAS {fmt(before, '', 'x')} → {fmt(after, '', 'x')}
      {breaks && (
        <span className="mt-1 block font-medium">
          The offer pushes break-even past the 6x line — the §1 blocking gate
          now applies to the discounted economics.
        </span>
      )}
    </div>
  );
}

const fmt = (value: number | null, prefix = '', suffix = '') =>
  value !== null ? `${prefix}${value}${suffix}` : '—';
