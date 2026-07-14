import { z } from 'zod';
import { isoDate, moneyValue, nullableNumber } from '../primitives';

export const OBJECTIVES = [
  'AWARENESS',
  'TRAFFIC',
  'ENGAGEMENT',
  'LEADS',
  'APP_PROMOTION',
  'SALES',
] as const;
export type Objective = (typeof OBJECTIVES)[number];

/**
 * Meta's objective → conversion location → performance goal matrix,
 * hardcoded (no API for it). Locations/goals trimmed to the common set.
 */
export const OBJECTIVE_TREE: Record<
  Objective,
  { locations: string[]; goals: string[] }
> = {
  AWARENESS: {
    locations: ['—'],
    goals: ['Maximise reach', 'Maximise ad recall lift', 'Maximise video views'],
  },
  TRAFFIC: {
    locations: ['Website', 'App', 'Messaging', 'Calls'],
    goals: [
      'Maximise link clicks',
      'Maximise landing page views',
      'Maximise conversations',
    ],
  },
  ENGAGEMENT: {
    locations: ['Website', 'Messaging', 'On your ad'],
    goals: ['Maximise engagement', 'Maximise conversions', 'Maximise conversations'],
  },
  LEADS: {
    locations: ['Website', 'Instant Forms', 'Messaging', 'Calls', 'App'],
    goals: [
      'Maximise number of leads',
      'Maximise number of conversion leads',
      'Maximise conversions',
    ],
  },
  APP_PROMOTION: {
    locations: ['App'],
    goals: ['Maximise app installs', 'Maximise app events', 'Maximise value'],
  },
  SALES: {
    locations: ['Website', 'App', 'Website + App', 'Messaging', 'Store'],
    goals: ['Maximise number of conversions', 'Maximise conversion value'],
  },
};

/** Seed list for the optimization-event combobox (free text allowed). */
export const SUGGESTED_STANDARD_EVENTS = [
  'Purchase',
  'Lead',
  'CompleteRegistration',
  'InitiateCheckout',
  'AddToCart',
  'AddPaymentInfo',
  'Subscribe',
  'StartTrial',
  'Contact',
  'SubmitApplication',
  'Schedule',
  'ViewContent',
] as const;

export const AD_SET_PURPOSES = [
  'PROSPECTING',
  'RETARGETING',
  'RETENTION',
  'EXPERIMENT_ARM',
] as const;
export type AdSetPurpose = (typeof AD_SET_PURPOSES)[number];

export const REPORTING_WINDOWS = [
  '7d_click',
  '7d_click_1d_view',
  '28d_click',
  'other',
] as const;

export const DECISION_WINDOWS = [7, 30, 60, 90] as const;

/** S4 — structure & feasibility (playbook §3.2, §3.3, §4.3). */
export const s4Schema = z.object({
  objective: z.enum(OBJECTIVES).nullable(),
  conversionLocation: z.string().nullable(),
  performanceGoal: z.string().nullable(),
  /** ⭐ The most important field on the page (§3.2). */
  optimizationEvent: z.object({
    name: z.string().default(''),
    isStandard: z.boolean().default(true),
  }),
  whyThisEvent: z.string().default(''),
  expectedWeeklyEventVolume: nullableNumber,
  budgetStrategy: z.enum(['CBO', 'ABO']).nullable(),
  campaignDailyBudget: moneyValue,
  targetCpa: moneyValue,
  adSets: z
    .array(
      z.object({
        id: z.string(),
        purpose: z.enum(AD_SET_PURPOSES).nullable(),
        dailyBudget: moneyValue,
        audienceSummary: z.string().default(''),
      }),
    )
    .default([]),
  /** Required when G-S4-LEARNING-INFEASIBLE fires. */
  decisionWindowDays: z
    .union([z.literal(7), z.literal(30), z.literal(60), z.literal(90)])
    .nullable(),
  uncertaintyDisclosure: z.object({
    sent: z.boolean().nullable(),
    date: isoDate,
  }),
  reportingWindow: z.enum(REPORTING_WINDOWS).nullable(),
  baselinePeriod: z.object({ from: isoDate, to: isoDate }),
  attributionChangeAcknowledged: z.boolean().default(false),
});
export type S4Values = z.infer<typeof s4Schema>;

export const emptyS4 = (): S4Values => ({
  objective: null,
  conversionLocation: null,
  performanceGoal: null,
  optimizationEvent: { name: '', isStandard: true },
  whyThisEvent: '',
  expectedWeeklyEventVolume: null,
  budgetStrategy: null,
  campaignDailyBudget: null,
  targetCpa: null,
  adSets: [],
  decisionWindowDays: null,
  uncertaintyDisclosure: { sent: null, date: null },
  reportingWindow: null,
  baselinePeriod: { from: null, to: null },
  attributionChangeAcknowledged: false,
});
