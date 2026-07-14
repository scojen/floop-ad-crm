import { z } from 'zod';
import {
  emptyTriState,
  nullableNumber,
  pct0to100,
  triState,
} from '../primitives';

export const CAPI_MODES = ['none', 'platform_app', 'server_custom'] as const;

export const ATTRIBUTION_SETTINGS = [
  '7d_click',
  '7d_click_1d_engage',
  '7d_click_1d_engage_1d_view',
  'other',
] as const;

export const MATCH_PARAMETERS = [
  'hashedEmail',
  'hashedPhone',
  'firstName',
  'lastName',
  'city',
  'state',
  'zip',
  'country',
  'ip',
  'userAgent',
  'fbc',
  'fbp',
  'externalId',
] as const;
export type MatchParameter = (typeof MATCH_PARAMETERS)[number];

const parameterChecks = z.object(
  Object.fromEntries(
    MATCH_PARAMETERS.map((key) => [key, z.boolean().default(false)]),
  ) as Record<MatchParameter, z.ZodDefault<z.ZodBoolean>>,
);

/** S3 — Measurement readiness (playbook ch. 5). */
export const s3Schema = z.object({
  pixelFiring: triState,
  capiMode: z.enum(CAPI_MODES).nullable(),
  /** event_id from a stable business ID, identical browser & server (§5.3). */
  eventIdDedup: triState,
  emqScore: nullableNumber, // 0–10 (§5.4)
  parameters: parameterChecks,
  /** The four-layers reconciliation (§5.1). */
  reconciliation: z.object({
    backendOrders7d: nullableNumber,
    eventsManagerReceived7d: nullableNumber,
  }),
  /** Required when vertical is lead gen / B2B (§5.7). */
  crm: z.object({
    connected: z.boolean().nullable(),
    stageDictionaryDefined: z.boolean().nullable(),
    uploadLagMedianHours: nullableNumber,
  }),
  privacy: z.object({
    dpaExecuted: z.boolean().nullable(),
    lawfulBasis: z
      .object({
        kind: z.enum(['consent', 'legitimate_interest', 'other']).nullable(),
        detail: z.string().default(''),
      })
      .default({ kind: null, detail: '' }),
    consentGating: z.boolean().nullable(),
    prohibitedDataAttestation: z.boolean().default(false),
    retentionPolicyDocumented: z.boolean().nullable(),
  }),
  attribution: z.object({
    setting: z.enum(ATTRIBUTION_SETTINGS).nullable(),
    viewThroughSharePct: pct0to100,
  }),
});
export type S3Values = z.infer<typeof s3Schema>;

export const emptyS3 = (): S3Values => ({
  pixelFiring: emptyTriState(),
  capiMode: null,
  eventIdDedup: emptyTriState(),
  emqScore: null,
  parameters: Object.fromEntries(
    MATCH_PARAMETERS.map((key) => [key, false]),
  ) as Record<MatchParameter, boolean>,
  reconciliation: { backendOrders7d: null, eventsManagerReceived7d: null },
  crm: {
    connected: null,
    stageDictionaryDefined: null,
    uploadLagMedianHours: null,
  },
  privacy: {
    dpaExecuted: null,
    lawfulBasis: { kind: null, detail: '' },
    consentGating: null,
    prohibitedDataAttestation: false,
    retentionPolicyDocumented: null,
  },
  attribution: { setting: null, viewThroughSharePct: null },
});
