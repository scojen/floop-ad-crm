/**
 * Unit-economics math from the playbook (meta-ads-playbook.md).
 * Pure TS — no React, no project imports beyond ./round.
 *
 * Null discipline: every derived number is `number | null`; null means
 * "not computable from current inputs" and must render as an em-dash,
 * never NaN. Required inputs are AOV and COGS (ecom) / all four lead-gen
 * inputs; optional costs default to 0.
 */
import { isNum, orZero, round2, safeDiv } from './round';

export interface CurrencyOrPercent {
  mode: 'currency' | 'percent';
  value: number | null;
}

export interface EcomBuildInput {
  aov: number | null;
  promo: CurrencyOrPercent;
  cogs: number | null;
  fulfillment: number | null;
  paymentPct: number | null;
  paymentFixed: number | null;
  expectedReturnsPct: number | null;
  /** Explicit currency override for returns cost; wins over the % input. */
  returnsCostOverride: number | null;
  variableCsPackaging: number | null;
  extraCosts: { id: string; label: string; amount: number | null }[];
}

export interface ContributionResult {
  netRevenue: number | null;
  promoCost: number | null;
  paymentCost: number | null;
  returnsCost: number | null;
  totalVariableCost: number | null;
  /** CONTRIBUTION BEFORE ADS (§2.1) */
  contribution: number | null;
  contributionPctOfGross: number | null;
}

const NULL_CONTRIBUTION: ContributionResult = {
  netRevenue: null,
  promoCost: null,
  paymentCost: null,
  returnsCost: null,
  totalVariableCost: null,
  contribution: null,
  contributionPctOfGross: null,
};

/** §2.1: contribution before ads = net revenue − every cost that changes per order. */
export function computeEcomContribution(
  input: EcomBuildInput,
): ContributionResult {
  if (!isNum(input.aov) || !isNum(input.cogs)) {
    return NULL_CONTRIBUTION;
  }

  const promoCost =
    input.promo.mode === 'percent'
      ? input.aov * (orZero(input.promo.value) / 100)
      : orZero(input.promo.value);
  const netRevenue = input.aov - promoCost;

  const paymentCost =
    netRevenue * (orZero(input.paymentPct) / 100) + orZero(input.paymentFixed);
  const returnsCost = isNum(input.returnsCostOverride)
    ? input.returnsCostOverride
    : netRevenue * (orZero(input.expectedReturnsPct) / 100);

  const extraTotal = input.extraCosts.reduce(
    (sum, row) => sum + orZero(row.amount),
    0,
  );
  const totalVariableCost =
    input.cogs +
    orZero(input.fulfillment) +
    paymentCost +
    returnsCost +
    orZero(input.variableCsPackaging) +
    extraTotal;

  const contribution = netRevenue - totalVariableCost;
  return {
    netRevenue: round2(netRevenue),
    promoCost: round2(promoCost),
    paymentCost: round2(paymentCost),
    returnsCost: round2(returnsCost),
    totalVariableCost: round2(totalVariableCost),
    contribution: round2(contribution),
    contributionPctOfGross: round2((contribution / input.aov) * 100),
  };
}

export interface LeadGenBuildInput {
  /** COLLECTED contribution per closed deal — "a signed case is not cash". */
  contributionPerClose: number | null;
  /** Funnel stage rates, each 0–100. */
  pQualGivenLeadPct: number | null;
  pApptGivenQualPct: number | null;
  pCloseGivenApptPct: number | null;
}

/** §2.5: EV per raw lead = P(qual) × P(appt|qual) × P(close|appt) × collected contribution. */
export function computeLeadEv(input: LeadGenBuildInput): {
  evPerRawLead: number | null;
} {
  if (
    !isNum(input.contributionPerClose) ||
    !isNum(input.pQualGivenLeadPct) ||
    !isNum(input.pApptGivenQualPct) ||
    !isNum(input.pCloseGivenApptPct)
  ) {
    return { evPerRawLead: null };
  }
  const ev =
    input.contributionPerClose *
    (input.pQualGivenLeadPct / 100) *
    (input.pApptGivenQualPct / 100) *
    (input.pCloseGivenApptPct / 100);
  return { evPerRawLead: round2(ev) };
}

export interface TargetsInput {
  grossOrderValue: number | null;
  netRevenue: number | null;
  contributionBeforeAds: number | null;
  requiredContributionAfterAds: number | null;
}

export interface TargetsResult {
  allowableCac: number | null;
  breakEvenRoas: number | null;
  targetRoas: number | null;
}

/** §2.2 targets. */
export function computeTargets(input: TargetsInput): TargetsResult {
  const allowableCac =
    isNum(input.contributionBeforeAds) &&
    isNum(input.requiredContributionAfterAds)
      ? round2(
          input.contributionBeforeAds - input.requiredContributionAfterAds,
        )
      : null;

  // Break-even ROAS = gross order value ÷ contribution before ads (spec S1c;
  // matches the playbook heuristic 1 ÷ contribution-rate when gross ≈ price).
  const breakEven = safeDiv(input.grossOrderValue, input.contributionBeforeAds);

  // Target ROAS: the build spec says gross ÷ allowable CAC, but playbook §2.2
  // defines it as NET REVENUE ÷ allowable CAC and the VELLUM worked example
  // (72 ÷ 26 = 2.77x) only reconciles with net revenue. Per the spec's own
  // rule ("where this prompt and the playbook conflict, follow the playbook"),
  // net revenue wins.
  const target =
    isNum(allowableCac) && allowableCac > 0
      ? safeDiv(input.netRevenue, allowableCac)
      : null;

  return {
    allowableCac,
    breakEvenRoas: breakEven === null ? null : round2(breakEven),
    targetRoas: target === null ? null : round2(target),
  };
}

/** §2.5: allowable CPL = EV per raw lead − required contribution per raw lead. */
export function computeAllowableCpl(
  evPerRawLead: number | null,
  requiredContributionPerRawLead: number | null,
): number | null {
  if (!isNum(evPerRawLead) || !isNum(requiredContributionPerRawLead)) {
    return null;
  }
  return round2(evPerRawLead - requiredContributionPerRawLead);
}

export interface LtvInput {
  /** Expected monthly contribution per active customer. */
  contributionPerMonth: number | null;
  retention: { mode: 'months' | 'churnPct'; value: number | null };
  /** Annual discount rate in percent (default 12). */
  discountRateAnnualPct: number | null;
  horizonMonths?: number;
}

export function monthlyChurn(retention: LtvInput['retention']): number | null {
  if (!isNum(retention.value) || retention.value <= 0) return null;
  if (retention.mode === 'churnPct') {
    return Math.min(retention.value / 100, 1);
  }
  return Math.min(1 / retention.value, 1);
}

/** §2.3: discounted contribution LTV = Σ contribution × survival_t ÷ (1+r/12)^t. */
export function computeLtv(input: LtvInput): { discountedLtv: number | null } {
  const churn = monthlyChurn(input.retention);
  if (!isNum(input.contributionPerMonth) || churn === null) {
    return { discountedLtv: null };
  }
  const horizon = input.horizonMonths ?? 36;
  const monthlyRate = (orZero(input.discountRateAnnualPct) || 0) / 100 / 12;
  let ltv = 0;
  for (let t = 1; t <= horizon; t++) {
    const survival = (1 - churn) ** t;
    ltv += (input.contributionPerMonth * survival) / (1 + monthlyRate) ** t;
  }
  return { discountedLtv: round2(ltv) };
}

export interface PaybackInput {
  cac: number | null;
  contributionPerMonth: number | null;
  /** 0 = undiscounted simple payback (the playbook's AXIOM "~4.5 months"). */
  churnMonthly?: number | null;
  horizonMonths?: number;
}

/** §2.4: payback month = first month cumulative cohort contribution ≥ CAC. */
export function computePayback(input: PaybackInput): {
  paybackMonth: number | null;
  paybackMonthsFractional: number | null;
} {
  if (
    !isNum(input.cac) ||
    !isNum(input.contributionPerMonth) ||
    input.cac <= 0 ||
    input.contributionPerMonth <= 0
  ) {
    return { paybackMonth: null, paybackMonthsFractional: null };
  }
  const churn = orZero(input.churnMonthly);
  const horizon = input.horizonMonths ?? 36;
  let cumulative = 0;
  for (let t = 1; t <= horizon; t++) {
    const monthContribution = input.contributionPerMonth * (1 - churn) ** t;
    const before = cumulative;
    cumulative += monthContribution;
    if (cumulative >= input.cac) {
      const fraction =
        monthContribution > 0 ? (input.cac - before) / monthContribution : 1;
      return {
        paybackMonth: t,
        paybackMonthsFractional: round2(t - 1 + fraction),
      };
    }
  }
  return { paybackMonth: null, paybackMonthsFractional: null };
}

export interface CashRequirementInput {
  plannedMonthlySpend: number | null;
  cac: number | null;
  paybackMonth: number | null;
}

/**
 * §2.4 cash schedule, first order: while scaling, every month adds a new
 * unrecouped cohort until the oldest repays — peak outstanding is
 * approximately monthly spend × payback months (documented approximation).
 */
export function computeCashRequirement(input: CashRequirementInput): {
  newCustomersPerMonth: number | null;
  monthlyAcquisitionCash: number | null;
  peakCashOutstanding: number | null;
  monthsToCohortCashPositive: number | null;
} {
  const newCustomers = safeDiv(input.plannedMonthlySpend, input.cac);
  return {
    newCustomersPerMonth: newCustomers === null ? null : round2(newCustomers),
    monthlyAcquisitionCash: isNum(input.plannedMonthlySpend)
      ? round2(input.plannedMonthlySpend)
      : null,
    peakCashOutstanding:
      isNum(input.plannedMonthlySpend) && isNum(input.paybackMonth)
        ? round2(input.plannedMonthlySpend * input.paybackMonth)
        : null,
    monthsToCohortCashPositive: input.paybackMonth,
  };
}

export interface WhatIfLevers {
  /** Currency delta applied to AOV (price lever). */
  priceDelta: number | null;
  /** Bundle lever: multiplies AOV and COGS. */
  bundle: { aovFactor: number | null; cogsFactor: number | null } | null;
  /** Replaces expectedReturnsPct when set. */
  returnRatePctOverride: number | null;
  /** Currency delta applied to fulfillment (freight lever). */
  freightDelta: number | null;
}

/**
 * The live what-if engine behind the G-S1-BE-ROAS-GT6 gate: apply the four
 * levers (§2.1 remedies — price, bundle, returns, freight) and recompute.
 */
export function applyWhatIf(
  base: EcomBuildInput,
  levers: WhatIfLevers,
  requiredContributionAfterAds: number | null,
): { build: EcomBuildInput; contribution: ContributionResult; targets: TargetsResult } {
  const aov = isNum(base.aov)
    ? (base.aov + orZero(levers.priceDelta)) *
      (levers.bundle && isNum(levers.bundle.aovFactor)
        ? levers.bundle.aovFactor
        : 1)
    : null;
  const cogs = isNum(base.cogs)
    ? base.cogs *
      (levers.bundle && isNum(levers.bundle.cogsFactor)
        ? levers.bundle.cogsFactor
        : 1)
    : null;
  const build: EcomBuildInput = {
    ...base,
    aov,
    cogs,
    fulfillment: isNum(base.fulfillment)
      ? base.fulfillment + orZero(levers.freightDelta)
      : orZero(levers.freightDelta) || base.fulfillment,
    expectedReturnsPct: isNum(levers.returnRatePctOverride)
      ? levers.returnRatePctOverride
      : base.expectedReturnsPct,
    // A what-if on rates should re-derive returns, not keep a stale override.
    returnsCostOverride: isNum(levers.returnRatePctOverride)
      ? null
      : base.returnsCostOverride,
  };
  const contribution = computeEcomContribution(build);
  const targets = computeTargets({
    grossOrderValue: build.aov,
    netRevenue: contribution.netRevenue,
    contributionBeforeAds: contribution.contribution,
    requiredContributionAfterAds,
  });
  return { build, contribution, targets };
}
