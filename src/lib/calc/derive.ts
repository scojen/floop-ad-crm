/**
 * The single composition point: raw form values → every derived number the
 * sidebar, gates, autosave snapshot, and markdown brief consume.
 * Pure TS — safe to call on every keystroke.
 */
import {
  experimentRequired,
  type BriefFormValues,
} from '../schema/campaign-brief';
import {
  economicShapeFor,
  engineFor,
  type CampaignIntent,
  type EconomicShape,
} from '../schema/sections/s0-client';
import {
  applyOfferImpact,
  applyWhatIf,
  computeAllowableCpl,
  computeCashRequirement,
  computeEcomContribution,
  computeLeadEv,
  computeLtv,
  computePayback,
  computeTargets,
  monthlyChurn,
  type ContributionResult,
  type TargetsResult,
} from './economics';
import {
  computeExperimentPlan,
  type ExperimentPlanResult,
} from './power';
import {
  maxSupportableAdSets,
  minDailyBudgetPerAdSet,
  projectedWeeklyEvents,
} from './learning';
import { isNum, round2, safeDiv } from './round';

export interface DerivedCalcs {
  build: 'ecom' | 'leadGen';
  /** The economic shape — decides vocabulary and verdict framing. */
  shape: EconomicShape;
  intent: CampaignIntent | null;
  contribution: ContributionResult;
  evPerRawLead: number | null;
  allowableCpl: number | null;
  targets: TargetsResult;
  ltv: {
    discountedLtv: number | null;
    ltvToCac: number | null;
    paybackMonth: number | null;
    paybackMonthsFractional: number | null;
    newCustomersPerMonth: number | null;
    monthlyAcquisitionCash: number | null;
    peakCashOutstanding: number | null;
    monthsToCohortCashPositive: number | null;
  };
  learning: {
    minDailyBudgetPerAdSet: number | null;
    maxSupportableAdSets: number | null;
    projectedWeeklyEvents: number | null;
  };
  receiptRatio: number | null;
  whatIf: { contribution: ContributionResult; targets: TargetsResult } | null;
  /** S6 offer applied to the §1 economics — the before/after. */
  offer: { contribution: ContributionResult; targets: TargetsResult } | null;
  /** S10 live power block. */
  experiment: ExperimentPlanResult | null;
  experimentRequired: boolean;
  /** Unlock predicate for S2+ ("nothing else unlocks until §1 validates"). */
  economicsValid: boolean;
}

export function deriveCalcs(brief: BriefFormValues): DerivedCalcs {
  const shape = economicShapeFor(brief.s0.vertical, brief.s0.businessModel);
  const build = engineFor(shape) === 'chain' ? 'leadGen' : ('ecom' as const);
  const required = brief.s1.targets.requiredContributionAfterAds;

  // Take rate only participates for the TAKE_RATE shape — a value left
  // behind after a vertical flip must not silently deflate the numbers.
  const ecomInput =
    shape === 'TAKE_RATE'
      ? brief.s1.ecom
      : { ...brief.s1.ecom, takeRatePct: null };

  const contribution = computeEcomContribution(ecomInput);
  const { evPerRawLead } = computeLeadEv(brief.s1.leadGen);
  const allowableCpl = computeAllowableCpl(evPerRawLead, required);

  const targets =
    build === 'ecom'
      ? computeTargets({
          grossOrderValue: brief.s1.ecom.aov,
          netRevenue: contribution.netRevenue,
          contributionBeforeAds: contribution.contribution,
          requiredContributionAfterAds: required,
        })
      : // Lead gen: CAC-per-lead economics; ROAS targets are not the frame.
        {
          allowableCac: allowableCpl,
          breakEvenRoas: null,
          targetRoas: null,
        };

  const churn = monthlyChurn(brief.s1.ltv.retention);
  const { discountedLtv } = computeLtv({
    contributionPerMonth: brief.s1.ltv.contributionPerMonth,
    retention: brief.s1.ltv.retention,
    discountRateAnnualPct: brief.s1.ltv.discountRateAnnualPct,
  });
  const payback = computePayback({
    cac: targets.allowableCac,
    contributionPerMonth: brief.s1.ltv.contributionPerMonth,
    churnMonthly: churn,
  });
  const cash = computeCashRequirement({
    plannedMonthlySpend: brief.s1.ltv.plannedMonthlySpend,
    cac: targets.allowableCac,
    paybackMonth: payback.paybackMonth,
  });
  const ltvToCacRaw = safeDiv(discountedLtv, targets.allowableCac);

  const learning = {
    minDailyBudgetPerAdSet: minDailyBudgetPerAdSet(brief.s4.targetCpa),
    maxSupportableAdSets: maxSupportableAdSets(
      brief.s4.campaignDailyBudget,
      brief.s4.targetCpa,
    ),
    projectedWeeklyEvents: projectedWeeklyEvents(
      brief.s4.campaignDailyBudget,
      brief.s4.targetCpa,
    ),
  };

  const receiptRatioRaw = safeDiv(
    brief.s3.reconciliation.eventsManagerReceived7d,
    brief.s3.reconciliation.backendOrders7d,
  );

  const hasWhatIfLever =
    isNum(brief.s1.targets.whatIf.priceDelta) ||
    isNum(brief.s1.targets.whatIf.returnRatePctOverride) ||
    isNum(brief.s1.targets.whatIf.freightDelta) ||
    brief.s1.targets.whatIf.bundle !== null;
  const whatIf =
    build === 'ecom' && hasWhatIfLever
      ? (() => {
          const result = applyWhatIf(
            ecomInput,
            brief.s1.targets.whatIf,
            required,
          );
          return { contribution: result.contribution, targets: result.targets };
        })()
      : null;

  const awareness = brief.s0.campaignIntent === 'AWARENESS';

  const offer =
    !awareness &&
    build === 'ecom' &&
    brief.s6.offerType !== null &&
    brief.s6.offerType !== 'NONE'
      ? applyOfferImpact(
          ecomInput,
          {
            discount: brief.s6.discount,
            giftCostPerOrder: brief.s6.giftCostPerOrder,
            expectedAovImpact: brief.s6.expectedAovImpact,
          },
          required,
        )
      : null;

  const experiment = computeExperimentPlan({
    baselineRatePct: brief.s10.power.baselineRatePct,
    mdeRelativePct: brief.s10.power.mdeRelativePct,
    alphaPct: brief.s10.power.alphaPct,
    powerPct: brief.s10.power.powerPct,
    allocationPctA: brief.s10.power.allocationPctA,
    targetCpa: brief.s4.targetCpa,
    dailyTestBudget: brief.s10.dailyTestBudget,
  });

  const buildComplete =
    build === 'ecom'
      ? contribution.contribution !== null
      : evPerRawLead !== null;
  const ltvRequired =
    brief.s0.businessModel === 'SUBSCRIPTION' || shape === 'SUBSCRIBER';
  const ltvComplete =
    !ltvRequired ||
    (isNum(brief.s1.ltv.contributionPerMonth) &&
      isNum(brief.s1.ltv.retention.value) &&
      isNum(brief.s1.ltv.plannedMonthlySpend));
  const economicsValid = awareness
    ? // Awareness: the investment rationale replaces the contribution math.
      isNum(brief.s1.awareness.plannedMonthlyBudget) &&
      brief.s1.awareness.futureValueHypothesis.trim().length > 0
    : buildComplete && isNum(required) && targets.allowableCac !== null && ltvComplete;

  return {
    build,
    shape,
    intent: brief.s0.campaignIntent,
    contribution,
    evPerRawLead,
    allowableCpl,
    targets,
    ltv: {
      discountedLtv,
      ltvToCac: ltvToCacRaw === null ? null : round2(ltvToCacRaw),
      paybackMonth: payback.paybackMonth,
      paybackMonthsFractional: payback.paybackMonthsFractional,
      ...cash,
    },
    learning,
    receiptRatio: receiptRatioRaw === null ? null : round2(receiptRatioRaw),
    whatIf,
    offer,
    experiment,
    experimentRequired: experimentRequired(brief),
    economicsValid,
  };
}
