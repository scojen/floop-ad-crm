import { z } from 'zod';
import {
  currencyOrPct,
  moneyValue,
  nullableNumber,
  pct0to100,
} from '../primitives';

/** S1a — linear contribution build (playbook §2.1). Field labels are
 *  shape-aware in the UI: "AOV" reads as GMV per transaction (take-rate),
 *  first-period revenue (subscriber), or average ticket (booking). */
export const ecomBuildSchema = z.object({
  aov: moneyValue,
  /** TAKE_RATE shape only: the % of the transaction the business keeps. */
  takeRatePct: pct0to100,
  promo: currencyOrPct,
  cogs: moneyValue,
  fulfillment: moneyValue,
  paymentPct: pct0to100,
  paymentFixed: moneyValue,
  expectedReturnsPct: pct0to100,
  returnsCostOverride: moneyValue,
  variableCsPackaging: moneyValue,
  extraCosts: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        amount: moneyValue,
      }),
    )
    ,
});
export type EcomBuildValues = z.infer<typeof ecomBuildSchema>;

/** S1b — lead gen / high-ticket build (playbook §2.5). */
export const leadGenBuildSchema = z.object({
  /** COLLECTED, not signed — "a signed case is not cash". */
  contributionPerClose: moneyValue,
  pQualGivenLeadPct: pct0to100,
  pApptGivenQualPct: pct0to100,
  pCloseGivenApptPct: pct0to100,
});
export type LeadGenBuildValues = z.infer<typeof leadGenBuildSchema>;

/** What-if levers persisted with the draft so exploration survives autosave. */
export const whatIfSchema = z.object({
  priceDelta: nullableNumber,
  bundle: z
    .object({ aovFactor: nullableNumber, cogsFactor: nullableNumber })
    .nullable(),
  returnRatePctOverride: pct0to100,
  freightDelta: nullableNumber,
});

/** S1c — targets (playbook §2.2). */
export const targetsSchema = z.object({
  /** Per order (ecom) / per raw lead (lead gen). */
  requiredContributionAfterAds: moneyValue,
  whatIf: whatIfSchema,
});

/** S1d — LTV & payback (playbook §2.3, §2.4). Required when SUBSCRIPTION. */
export const ltvSchema = z.object({
  contributionPerMonth: moneyValue,
  retention: z.object({
    mode: z.enum(['months', 'churnPct']),
    value: nullableNumber,
  }),
  discountRateAnnualPct: pct0to100,
  plannedMonthlySpend: moneyValue,
  cashBufferConfirmed: z.boolean(),
  cashBufferNote: z.string(),
});

/**
 * Awareness-intent replacement for the contribution build: an investment
 * rationale. No ROAS/CAC math applies — but budget, guardrail, and a
 * written future-value hypothesis are still mandatory (§1.5: brand and
 * performance are one system; awareness is an economic bet with a
 * different evidence standard).
 */
export const awarenessRationaleSchema = z.object({
  plannedMonthlyBudget: moneyValue,
  /** Cap as % of revenue or absolute currency — the spend guardrail. */
  spendGuardrail: z.object({
    mode: z.enum(['pctOfRevenue', 'currency']),
    value: nullableNumber,
  }),
  futureValueHypothesis: z.string(),
  horizonMonths: nullableNumber,
});

export const s1Schema = z.object({
  ecom: ecomBuildSchema,
  leadGen: leadGenBuildSchema,
  awareness: awarenessRationaleSchema,
  targets: targetsSchema,
  ltv: ltvSchema,
});
export type S1Values = z.infer<typeof s1Schema>;

export const emptyS1 = (): S1Values => ({
  ecom: {
    aov: null,
    takeRatePct: null,
    promo: { mode: 'percent', value: null },
    cogs: null,
    fulfillment: null,
    paymentPct: null,
    paymentFixed: null,
    expectedReturnsPct: null,
    returnsCostOverride: null,
    variableCsPackaging: null,
    extraCosts: [],
  },
  leadGen: {
    contributionPerClose: null,
    pQualGivenLeadPct: null,
    pApptGivenQualPct: null,
    pCloseGivenApptPct: null,
  },
  awareness: {
    plannedMonthlyBudget: null,
    spendGuardrail: { mode: 'pctOfRevenue', value: null },
    futureValueHypothesis: '',
    horizonMonths: null,
  },
  targets: {
    requiredContributionAfterAds: null,
    whatIf: {
      priceDelta: null,
      bundle: null,
      returnRatePctOverride: null,
      freightDelta: null,
    },
  },
  ltv: {
    contributionPerMonth: null,
    retention: { mode: 'months', value: null },
    discountRateAnnualPct: 12,
    plannedMonthlySpend: null,
    cashBufferConfirmed: false,
    cashBufferNote: '',
  },
});
