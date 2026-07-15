import { z } from 'zod';
import { moneyValue, nullableNumber, pct0to100 } from '../primitives';

export const EXPERIMENT_DESIGNS = [
  'META_AB_TEST',
  'GEO_HOLDOUT',
  'CONVERSION_LIFT',
  'OBSERVATIONAL',
] as const;

export const STOPPING_RULES = ['FIXED_HORIZON', 'SEQUENTIAL'] as const;

/**
 * S10 — Experiment plan (§7). Required when purpose = LEARNING, or when
 * campaign intent = AWARENESS (a lift measure is the only scoreboard).
 */
export const s10Schema = z.object({
  /** Who, treatment contrast, outcome, time window (§7.1). */
  estimand: z.string(),
  design: z.enum(EXPERIMENT_DESIGNS).nullable(),
  randomizationUnit: z.string(),
  contaminationControls: z.string(),
  power: z.object({
    baselineRatePct: pct0to100,
    mdeRelativePct: nullableNumber,
    alphaPct: pct0to100,
    powerPct: pct0to100,
    allocationPctA: pct0to100,
  }),
  /** Daily budget for the test — drives days-to-complete. */
  dailyTestBudget: moneyValue,
  stoppingRule: z.enum(STOPPING_RULES).nullable(),
  sequentialMethod: z.string(),
  /** Pre-committed: what result leads to what action (§7.9). */
  decisionRule: z.string(),
  multipleComparisonPlan: z.string(),
  noPeekingAttestation: z.boolean(),
});
export type S10Values = z.infer<typeof s10Schema>;

export const emptyS10 = (): S10Values => ({
  estimand: '',
  design: null,
  randomizationUnit: '',
  contaminationControls: '',
  power: {
    baselineRatePct: null,
    mdeRelativePct: 20,
    alphaPct: 5,
    powerPct: 80,
    allocationPctA: 50,
  },
  dailyTestBudget: null,
  stoppingRule: null,
  sequentialMethod: '',
  decisionRule: '',
  multipleComparisonPlan: '',
  noPeekingAttestation: false,
});
