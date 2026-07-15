import { z } from 'zod';
import { AWARENESS_LEVELS } from './s7-creative';

/**
 * S8 — Creative assets & TAGGING. This section creates the dataset for
 * pooled regression; the tag schema is defined once, VERSIONED, and
 * enforced — adding a tag value is a schema change, never free text.
 */
export const TAG_SCHEMA_VERSION = 1;

export const CREATIVE_FORMATS = [
  'UGC_TALKING_HEAD',
  'STUDIO_DEMO',
  'STATIC_IMAGE',
  'CAROUSEL',
  'SLIDESHOW',
  'FOUNDER_POV',
  'SCREEN_RECORDING',
  'ANIMATION',
  'OTHER',
] as const;

export const HOOK_TYPES = [
  'QUESTION',
  'BOLD_CLAIM',
  'DEMONSTRATION',
  'PATTERN_INTERRUPT',
  'TESTIMONIAL_OPEN',
  'STATISTIC',
  'PROBLEM_VISUAL',
  'OTHER',
] as const;

export const FIRST_FRAME_CONTENT = [
  'FACE',
  'PRODUCT',
  'TEXT',
  'PROBLEM_VISUAL',
  'OTHER',
] as const;

export const TALENT_AGE_BANDS = ['18_24', '25_34', '35_44', '45_54', '55_PLUS', 'NA'] as const;

export const ASSET_PROOF_TYPES = [
  'BEFORE_AFTER',
  'MECHANISM_SCIENCE',
  'REVIEW_COUNT',
  'EXPERT',
  'DATA_STUDY',
  'NONE',
] as const;

export const OFFER_SHOWN = ['NONE', 'DISCOUNT', 'GIFT', 'BUNDLE', 'GUARANTEE'] as const;

export const LENGTH_BUCKETS = ['LT_15S', 'S15_30', 'S30_60', 'GT_60S', 'STATIC'] as const;

export const CREATIVE_CTAS = ['SHOP', 'LEARN', 'BOOK', 'SIGN_UP', 'CALL', 'NONE'] as const;

export const ASPECT_RATIOS = ['9_16', '4_5', '1_1', '16_9'] as const;

export const TEST_ROLES = ['CONTROL', 'VARIANT', 'NOT_IN_TEST'] as const;

export const creativeAssetSchema = z.object({
  /** Stable, never reused. Generated once at row creation. */
  creativeId: z.string(),
  /** URL or asset-manager ID — a reference, never a binary. */
  assetRef: z.string(),
  tags: z.object({
    awarenessLevel: z.enum(AWARENESS_LEVELS).nullable(),
    categoryEntryPoint: z.string(),
    format: z.enum(CREATIVE_FORMATS).nullable(),
    hookType: z.enum(HOOK_TYPES).nullable(),
    firstFrame: z.enum(FIRST_FRAME_CONTENT).nullable(),
    talentCreatorId: z.string(),
    talentAgeBand: z.enum(TALENT_AGE_BANDS).nullable(),
    talentProfessional: z.boolean().nullable(),
    proofType: z.enum(ASSET_PROOF_TYPES).nullable(),
    offerShown: z.enum(OFFER_SHOWN).nullable(),
    lengthBucket: z.enum(LENGTH_BUCKETS).nullable(),
    cta: z.enum(CREATIVE_CTAS).nullable(),
    brandIn2s: z.boolean().nullable(),
    aspectRatios: z.array(z.enum(ASPECT_RATIOS)),
  }),
  conceptId: z.string(),
  testRole: z.enum(TEST_ROLES).nullable(),
});
export type CreativeAssetValues = z.infer<typeof creativeAssetSchema>;

export const s8Schema = z.object({
  tagSchemaVersion: z.literal(TAG_SCHEMA_VERSION),
  assets: z.array(creativeAssetSchema),
});
export type S8Values = z.infer<typeof s8Schema>;

export const emptyS8 = (): S8Values => ({
  tagSchemaVersion: TAG_SCHEMA_VERSION,
  assets: [],
});

export const emptyCreativeAsset = (creativeId: string): CreativeAssetValues => ({
  creativeId,
  assetRef: '',
  tags: {
    awarenessLevel: null,
    categoryEntryPoint: '',
    format: null,
    hookType: null,
    firstFrame: null,
    talentCreatorId: '',
    talentAgeBand: null,
    talentProfessional: null,
    proofType: null,
    offerShown: null,
    lengthBucket: null,
    cta: null,
    brandIn2s: null,
    aspectRatios: [],
  },
  conceptId: '',
  testRole: null,
});
