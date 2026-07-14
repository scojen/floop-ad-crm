/**
 * Learning-phase feasibility math (§3.3): Meta's documented guideline is
 * ~50 optimization events per ad set in the week after the last significant
 * edit. A delivery-system guideline — not a significance threshold.
 */
import { isNum, round2, safeDiv } from './round';

const WEEKLY_EVENTS_TARGET = 50;

/** Min daily budget per ad set = (50 × target CPA) ÷ 7. */
export function minDailyBudgetPerAdSet(targetCpa: number | null): number | null {
  if (!isNum(targetCpa) || targetCpa <= 0) return null;
  return round2((WEEKLY_EVENTS_TARGET * targetCpa) / 7);
}

/** Max supportable ad sets = (daily budget × 7) ÷ (target CPA × 50). */
export function maxSupportableAdSets(
  campaignDailyBudget: number | null,
  targetCpa: number | null,
): number | null {
  if (!isNum(campaignDailyBudget) || campaignDailyBudget <= 0) return null;
  if (!isNum(targetCpa) || targetCpa <= 0) return null;
  const result = safeDiv(
    campaignDailyBudget * 7,
    targetCpa * WEEKLY_EVENTS_TARGET,
  );
  return result === null ? null : round2(result);
}

/** Projected optimization events per week at the planned budget. */
export function projectedWeeklyEvents(
  campaignDailyBudget: number | null,
  targetCpa: number | null,
): number | null {
  const result = safeDiv(
    isNum(campaignDailyBudget) ? campaignDailyBudget * 7 : null,
    targetCpa,
  );
  return result === null ? null : round2(result);
}
