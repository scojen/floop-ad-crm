import { z } from 'zod';
import { isoDate } from '../primitives';

export const SPECIAL_AD_CATEGORIES = [
  'NONE',
  'CREDIT_FINANCIAL',
  'EMPLOYMENT',
  'HOUSING',
  'SOCIAL_ISSUES_ELECTIONS_POLITICS',
] as const;

/** S9 — Policy pre-flight (ch. 12). Classify on the offer, not the industry label. */
export const s9Schema = z.object({
  specialAdCategory: z.enum(SPECIAL_AD_CATEGORIES).nullable(),
  /** Per-hook confirmation that personal-attribute rules were reviewed. */
  hookReviews: z.array(
    z.object({
      hookId: z.string(),
      confirmed: z.boolean(),
    }),
  ),
  claims: z.array(
    z.object({
      id: z.string(),
      claimText: z.string(),
      evidenceRef: z.string(),
      reviewedBy: z.string(),
      reviewedOn: isoDate,
    }),
  ),
  restrictedContentChecked: z.boolean(),
  reviewedBy: z.string(),
  reviewedOn: isoDate,
});
export type S9Values = z.infer<typeof s9Schema>;

export const emptyS9 = (): S9Values => ({
  specialAdCategory: null,
  hookReviews: [],
  claims: [],
  restrictedContentChecked: false,
  reviewedBy: '',
  reviewedOn: null,
});
