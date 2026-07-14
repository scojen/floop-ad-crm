/**
 * The single composition point: raw form values → every derived number the
 * sidebar, gates, autosave snapshot, and markdown brief consume.
 * Pure TS — safe to call on every keystroke.
 */
import type { BriefFormValues } from '../schema/campaign-brief';
import { requiredBuildFor } from '../schema/sections/s0-client';
import {
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
  maxSupportableAdSets,
  minDailyBudgetPerAdSet,
  projectedWeeklyEvents,
} from './learning';
import { isNum, round2, safeDiv } from './round';

export interface DerivedCalcs {
  build: 'ecom' | 'leadGen';
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
  /** Unlock predicate for S2–S4 ("nothing else unlocks until §1 validates"). */
  economicsValid: boolean;
}

export function deriveCalcs(brief: BriefFormValues): DerivedCalcs {
  const build = requiredBuildFor(brief.s0.vertical);
  const required = brief.s1.targets.requiredContributionAfterAds;

  const contribution = computeEcomContribution(brief.s1.ecom);
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
            brief.s1.ecom,
            brief.s1.targets.whatIf,
            required,
          );
          return { contribution: result.contribution, targets: result.targets };
        })()
      : null;

  const buildComplete =
    build === 'ecom'
      ? contribution.contribution !== null
      : evPerRawLead !== null;
  const ltvComplete =
    brief.s0.businessModel !== 'SUBSCRIPTION' ||
    (isNum(brief.s1.ltv.contributionPerMonth) &&
      isNum(brief.s1.ltv.retention.value) &&
      isNum(brief.s1.ltv.plannedMonthlySpend));
  const economicsValid =
    buildComplete && isNum(required) && targets.allowableCac !== null && ltvComplete;

  return {
    build,
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
    economicsValid,
  };
}
