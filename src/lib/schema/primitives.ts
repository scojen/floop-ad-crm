/**
 * Schema primitives shared by all sections. The base schema is LENIENT by
 * design: every leaf is nullable so a half-finished draft always parses.
 * Requiredness is enforced only at submit (see campaign-brief.ts).
 */
import { z } from 'zod';

/** Empty numeric inputs are null — never NaN, never ''. */
export const nullableNumber = z.number().finite().nullable();

export const moneyValue = z.number().finite().min(0).nullable();

export const pct0to100 = z.number().finite().min(0).max(100).nullable();

/** ISO date string (yyyy-mm-dd) or null. */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();

export const currencyOrPct = z.object({
  mode: z.enum(['currency', 'percent']),
  value: moneyValue,
});
export type CurrencyOrPct = z.infer<typeof currencyOrPct>;

/** ✅ Verified / ⚠️ Partial / ❌ Not in place + provenance. */
export const triState = z.object({
  status: z.enum(['pass', 'warn', 'fail']).nullable(),
  verifiedOn: isoDate,
  verifiedBy: z.string().nullable(),
});
export type TriState = z.infer<typeof triState>;

export const emptyTriState = (): TriState => ({
  status: null,
  verifiedOn: null,
  verifiedBy: null,
});
