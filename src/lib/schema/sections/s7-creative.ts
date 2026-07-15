import { z } from 'zod';

export const AWARENESS_LEVELS = [
  'UNAWARE',
  'PROBLEM_AWARE',
  'SOLUTION_AWARE',
  'PRODUCT_AWARE',
  'MOST_AWARE',
] as const;
export type AwarenessLevel = (typeof AWARENESS_LEVELS)[number];

export const PROOF_TYPES = [
  'DEMONSTRATION',
  'MECHANISM_SCIENCE',
  'EXPERT_AUTHORITY',
  'SOCIAL_PROOF',
  'BEFORE_AFTER',
  'GUARANTEE',
  'DATA_STUDY',
  'NONE',
] as const;

export const BRAND_ASSETS = [
  'LOGO',
  'COLORWAY',
  'SONIC',
  'CHARACTER',
  'PACKAGING',
  'SPOKESPERSON',
] as const;

/** S7 — Creative strategy & brief. "This is where the leverage is." (ch. 8) */
export const s7Schema = z.object({
  awarenessLevel: z.enum(AWARENESS_LEVELS).nullable(),
  /** The specific buying situation — a category entry point, not a hook. */
  categoryEntryPoint: z.string(),
  priorityCustomer: z.string(),
  /** One clear promise, ≤140 chars enforced at submit. */
  proposition: z.string(),
  reasonsToBelieve: z.array(z.enum(PROOF_TYPES)),
  reasonsDetail: z.string(),
  mandatoryBrandAssets: z.array(z.enum(BRAND_ASSETS)),
  brandVisibleFirst2s: z.boolean().nullable(),
  /** Min 3 at submit. */
  hookVariants: z.array(z.object({ id: z.string(), text: z.string() })),
  primaryCta: z.string(),
  destinationUrl: z.string(),
  utmParameters: z.string(),
});
export type S7Values = z.infer<typeof s7Schema>;

export const emptyS7 = (): S7Values => ({
  awarenessLevel: null,
  categoryEntryPoint: '',
  priorityCustomer: '',
  proposition: '',
  reasonsToBelieve: [],
  reasonsDetail: '',
  mandatoryBrandAssets: [],
  brandVisibleFirst2s: null,
  hookVariants: [],
  primaryCta: '',
  destinationUrl: '',
  utmParameters: '',
});
