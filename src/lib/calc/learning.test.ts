import { describe, expect, it } from 'vitest';
import {
  maxSupportableAdSets,
  minDailyBudgetPerAdSet,
  projectedWeeklyEvents,
} from './learning';

describe('learning-phase feasibility (§3.3)', () => {
  it('min daily budget per ad set = (50 × CPA) ÷ 7', () => {
    expect(minDailyBudgetPerAdSet(40)).toBe(285.71);
    expect(minDailyBudgetPerAdSet(28)).toBe(200);
  });

  it('max supportable ad sets = (budget × 7) ÷ (CPA × 50)', () => {
    expect(maxSupportableAdSets(200, 40)).toBe(0.7); // the <1.0 structural warning case
    expect(maxSupportableAdSets(300, 28)).toBe(1.5); // the spec sidebar example
  });

  it('projected weekly events at planned budget', () => {
    expect(projectedWeeklyEvents(300, 28)).toBe(75);
  });

  it('is null-safe on zero/missing inputs', () => {
    expect(minDailyBudgetPerAdSet(null)).toBeNull();
    expect(minDailyBudgetPerAdSet(0)).toBeNull();
    expect(maxSupportableAdSets(null, 40)).toBeNull();
    expect(maxSupportableAdSets(200, 0)).toBeNull();
    expect(projectedWeeklyEvents(200, null)).toBeNull();
  });
});
