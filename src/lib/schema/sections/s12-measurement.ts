import { z } from 'zod';
import { isoDate } from '../primitives';

export const PRIMARY_METRICS = [
  // Direct response
  'CONTRIBUTION_AFTER_MEDIA',
  'NEW_CUSTOMERS',
  'COST_PER_CLOSED_DEAL',
  'INCREMENTAL_CONTRIBUTION',
  'PLATFORM_ROAS',
  // Awareness
  'UNIQUE_REACH',
  'AD_RECALL_LIFT',
  'BRANDED_SEARCH_LIFT',
  'OTHER',
] as const;

/** S12 — Measurement & decision plan. The pre-registered expectation is the
 *  only field that improves the practitioner rather than the campaign. */
export const s12Schema = z.object({
  primaryMetric: z.enum(PRIMARY_METRICS).nullable(),
  secondaryMetrics: z.string(),
  /** Backend-first reporting commitment (checkbox). */
  reportingCommitment: z.boolean(),
  reviewDate: isoDate,
  /** What result stops this campaign? */
  killCriteria: z.string(),
  /** What do you expect to happen, in numbers, before seeing the data? */
  preRegisteredExpectation: z.string(),
});
export type S12Values = z.infer<typeof s12Schema>;

export const emptyS12 = (): S12Values => ({
  primaryMetric: null,
  secondaryMetrics: '',
  reportingCommitment: false,
  reviewDate: null,
  killCriteria: '',
  preRegisteredExpectation: '',
});
