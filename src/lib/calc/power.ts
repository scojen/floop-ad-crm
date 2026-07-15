/**
 * Experiment power math (§7.3): required sample for a two-proportion test.
 * "There is no universal 100 conversions per arm rule" — sample is a
 * function of baseline, MDE, alpha, power, and allocation.
 *
 * Formula (pooled two-proportion z-test, arm sizes nA and nB = k·nA):
 *   nA = [ z_{α/2}·√(p̄q̄(1 + 1/k)) + z_{β}·√(p1q1 + p2q2/k) ]² ÷ (p2 − p1)²
 * UI ships in slice 2; the module is complete and tested now.
 */
import { isNum } from './round';

export interface PowerInput {
  /** Baseline conversion rate, 0–1. */
  baselineRate: number;
  /** Minimum detectable effect. Relative (0.2 = +20% lift) or absolute. */
  mde: number;
  mdeMode: 'relative' | 'absolute';
  /** Two-sided significance level. Default 0.05. */
  alpha?: number;
  /** Statistical power. Default 0.80. */
  power?: number;
  /** Share of sample allocated to arm A. Default 0.5. */
  allocation?: number;
}

export interface PowerResult {
  nA: number;
  nB: number;
  total: number;
  variantRate: number;
}

export function requiredSampleSize(input: PowerInput): PowerResult | null {
  const alpha = input.alpha ?? 0.05;
  const power = input.power ?? 0.8;
  const allocation = input.allocation ?? 0.5;
  const p1 = input.baselineRate;
  const p2 =
    input.mdeMode === 'relative' ? p1 * (1 + input.mde) : p1 + input.mde;

  if (
    !isNum(p1) ||
    !isNum(p2) ||
    p1 <= 0 ||
    p1 >= 1 ||
    p2 <= 0 ||
    p2 >= 1 ||
    p1 === p2 ||
    alpha <= 0 ||
    alpha >= 1 ||
    power <= 0 ||
    power >= 1 ||
    allocation <= 0 ||
    allocation >= 1
  ) {
    return null;
  }

  // k = nB / nA
  const k = (1 - allocation) / allocation;
  const zAlpha = inverseNormalCdf(1 - alpha / 2);
  const zBeta = inverseNormalCdf(power);

  const pBar = (p1 + k * p2) / (1 + k);
  const qBar = 1 - pBar;
  const delta = Math.abs(p2 - p1);

  const term1 = zAlpha * Math.sqrt(pBar * qBar * (1 + 1 / k));
  const term2 = zBeta * Math.sqrt(p1 * (1 - p1) + (p2 * (1 - p2)) / k);
  const nA = Math.ceil(((term1 + term2) / delta) ** 2);
  // Guard against float artifacts in k (e.g. allocation 1/3 → k = 2.0000…04)
  // bumping nB by a phantom unit.
  const nB = Math.ceil(nA * k - 1e-9);
  return { nA, nB, total: nA + nB, variantRate: p2 };
}

export interface ExperimentPlanInput {
  baselineRatePct: number | null;
  mdeRelativePct: number | null;
  alphaPct: number | null;
  powerPct: number | null;
  allocationPctA: number | null;
  /** Cost per optimization event — prices the sample (§7.3). */
  targetCpa: number | null;
  dailyTestBudget: number | null;
}

export interface ExperimentPlanResult {
  nPerArm: number;
  nTotal: number;
  conversionsPerArmA: number;
  /** Null when no CPA is available (e.g. awareness lift tests). */
  estCostTotal: number | null;
  estDaysToComplete: number | null;
}

/** S10's live block: required n → conversions → cost → days at test budget. */
export function computeExperimentPlan(
  input: ExperimentPlanInput,
): ExperimentPlanResult | null {
  if (input.baselineRatePct === null || input.mdeRelativePct === null) {
    return null;
  }
  const sample = requiredSampleSize({
    baselineRate: input.baselineRatePct / 100,
    mde: input.mdeRelativePct / 100,
    mdeMode: 'relative',
    alpha: (input.alphaPct ?? 5) / 100,
    power: (input.powerPct ?? 80) / 100,
    allocation: (input.allocationPctA ?? 50) / 100,
  });
  if (!sample) return null;

  const p1 = input.baselineRatePct / 100;
  const conversionsPerArmA = Math.ceil(sample.nA * p1);
  const conversionsB = Math.ceil(sample.nB * sample.variantRate);

  let estCostTotal: number | null = null;
  let estDaysToComplete: number | null = null;
  if (input.targetCpa !== null && input.targetCpa > 0) {
    estCostTotal = Math.round((conversionsPerArmA + conversionsB) * input.targetCpa);
    if (input.dailyTestBudget !== null && input.dailyTestBudget > 0) {
      estDaysToComplete = Math.ceil(estCostTotal / input.dailyTestBudget);
    }
  }
  return {
    nPerArm: sample.nA,
    nTotal: sample.total,
    conversionsPerArmA,
    estCostTotal,
    estDaysToComplete,
  };
}

/** The "test big things" sensitivity table: days-to-complete across MDEs. */
export function mdeSensitivity(
  input: ExperimentPlanInput,
  mdes: number[] = [5, 10, 20, 30, 50],
): {
  mdePct: number;
  nPerArm: number | null;
  estCost: number | null;
  estDays: number | null;
}[] {
  return mdes.map((mdePct) => {
    const plan = computeExperimentPlan({ ...input, mdeRelativePct: mdePct });
    return {
      mdePct,
      nPerArm: plan?.nPerArm ?? null,
      estCost: plan?.estCostTotal ?? null,
      estDays: plan?.estDaysToComplete ?? null,
    };
  });
}

/**
 * Inverse standard-normal CDF (quantile). Acklam's rational approximation,
 * |relative error| < 1.15e-9 — precise enough for any alpha/power the form
 * will ever see.
 */
export function inverseNormalCdf(p: number): number {
  if (p <= 0 || p >= 1) {
    throw new RangeError('p must be in (0, 1)');
  }
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
        q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(
    (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}
