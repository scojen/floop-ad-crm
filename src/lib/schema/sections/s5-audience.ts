import { z } from 'zod';
import { nullableNumber } from '../primitives';

/** S5 — Audience. Deliberately minimal: post-ATT, the ad is the targeting (§3.5). */
export const s5Schema = z.object({
  geography: z.string(),
  language: z.string(),
  ageRange: z.object({ min: nullableNumber, max: nullableNumber }),
  /** Free-text audience names, one per chip. */
  exclusions: z.array(z.string()),
  /** How "existing customer" is defined — required for Advantage+ campaigns. */
  customerStatusDefinition: z.string(),
  customAudiences: z.array(z.string()),
  detailedTargeting: z.object({
    used: z.boolean(),
    hypothesis: z.string(),
  }),
});
export type S5Values = z.infer<typeof s5Schema>;

export const emptyS5 = (): S5Values => ({
  geography: '',
  language: '',
  ageRange: { min: null, max: null },
  exclusions: [],
  customerStatusDefinition: '',
  customAudiences: [],
  detailedTargeting: { used: false, hypothesis: '' },
});
