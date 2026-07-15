import { z } from 'zod';
import { currencyOrPct, isoDate, moneyValue, nullableNumber } from '../primitives';

export const OFFER_TYPES = [
  'NONE',
  'PERCENTAGE_DISCOUNT',
  'FIXED_DISCOUNT',
  'GIFT_WITH_PURCHASE',
  'FREE_TRIAL',
  'BUNDLE',
  'SUBSCRIPTION',
  'FINANCING',
  'GUARANTEE',
  'FREE_CONSULTATION',
  'OTHER',
] as const;

export const OFFER_RISKS = [
  'MARGIN_LOSS',
  'TRAINED_DISCOUNT_BEHAVIOR',
  'ADVERSE_SELECTION',
  'RETURNS',
  'CHURN',
  'REGULATORY_DISCLOSURE',
  'INVENTORY',
] as const;

/** S6 — Offer. An offer changes the §1 economics; the form recomputes live. */
export const s6Schema = z.object({
  offerType: z.enum(OFFER_TYPES).nullable(),
  details: z.string(),
  /** Discount magnitude (drives the live contribution recompute). */
  discount: currencyOrPct,
  /** Per-order variable cost of a gift/trial, if any. */
  giftCostPerOrder: moneyValue,
  /** Expected AOV impact, +/- currency. */
  expectedAovImpact: nullableNumber,
  risks: z.array(z.enum(OFFER_RISKS)),
  endDate: isoDate,
});
export type S6Values = z.infer<typeof s6Schema>;

export const emptyS6 = (): S6Values => ({
  offerType: null,
  details: '',
  discount: { mode: 'percent', value: null },
  giftCostPerOrder: null,
  expectedAovImpact: null,
  risks: [],
  endDate: null,
});
