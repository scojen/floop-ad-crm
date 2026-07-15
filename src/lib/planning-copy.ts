/**
 * Plain-English layer for the campaign prep form. Every entry pairs the
 * professional term with a one-sentence translation, so the form teaches
 * the vocabulary while it works ("plain English + the term").
 * §refs point at meta-ads-playbook.md.
 */
import type { DerivedCalcs } from './calc/derive';

const usd = (v: number) =>
  `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

/** Sentences under the sidebar's derived numbers. Null → don't render. */
export const METRIC_SENTENCES: Record<
  string,
  (calc: DerivedCalcs) => string | null
> = {
  contribution: (calc) =>
    calc.contribution.contribution !== null
      ? `Each order leaves ${usd(calc.contribution.contribution)} after every variable cost — your contribution margin (§2.1).`
      : null,
  evPerRawLead: (calc) =>
    calc.evPerRawLead !== null
      ? `A raw lead is worth ${usd(calc.evPerRawLead)} in expectation once the funnel decay is priced in — its expected value (§2.5).`
      : null,
  allowableCac: (calc) =>
    calc.targets.allowableCac !== null
      ? `You can pay Meta up to ${usd(calc.targets.allowableCac)} per ${calc.build === 'leadGen' ? 'raw lead — your allowable CPL' : 'new customer — your allowable CAC'} — and still hit your profit target (§2.2).`
      : null,
  breakEvenRoas: (calc) =>
    calc.targets.breakEvenRoas !== null
      ? `Every $1 of ads must bring back ${usd(calc.targets.breakEvenRoas)} of revenue just to not lose money — your break-even ROAS (§2.2).`
      : null,
  targetRoas: (calc) =>
    calc.targets.targetRoas !== null
      ? `The campaign is only succeeding above ${calc.targets.targetRoas}x — your target ROAS, the accountability line at review (§2.2).`
      : null,
  ltvToCac: (calc) =>
    calc.ltv.ltvToCac !== null
      ? `A customer returns ${calc.ltv.ltvToCac}× what they cost to acquire over their lifetime — your LTV:CAC ratio (§2.3).`
      : null,
  payback: (calc) =>
    calc.ltv.paybackMonthsFractional !== null
      ? `Cash spent on acquisition comes back after ~${calc.ltv.paybackMonthsFractional} months — your payback period; you finance the gap (§2.4).`
      : null,
  peakCash: (calc) =>
    calc.ltv.peakCashOutstanding !== null
      ? `While scaling, up to ${usd(calc.ltv.peakCashOutstanding)} sits unrecouped in stacked cohorts — your peak cash outstanding (§2.4).`
      : null,
  minBudget: (calc) =>
    calc.learning.minDailyBudgetPerAdSet !== null
      ? `Below ${usd(calc.learning.minDailyBudgetPerAdSet)}/day per ad set, delivery can't reach ~50 weekly events — the learning-phase floor (§3.3).`
      : null,
  receiptRatio: (calc) =>
    calc.receiptRatio !== null
      ? `Events Manager received ${Math.round(calc.receiptRatio * 100)}% of your backend records — your receipt ratio; sane is 0.70–1.15 (§5.1).`
      : null,
};

export interface FieldInfo {
  /** The professional term being taught. */
  term: string;
  /** Plain-English translation, one or two sentences. */
  plain: string;
  ref: string;
}

/** "Why we ask" popover copy for the jargon-heavy fields. */
export const FIELD_INFO: Record<string, FieldInfo> = {
  aov: {
    term: 'AOV — average order value',
    plain:
      'The typical amount a customer pays per order, before any costs. Everything else in this section is subtracted from it.',
    ref: '§2.1',
  },
  cogs: {
    term: 'COGS — cost of goods sold',
    plain:
      'What the product itself costs you, per order. Only the per-order cost belongs here — rent and salaries do not.',
    ref: '§2.1',
  },
  contributionBuild: {
    term: 'Contribution margin',
    plain:
      "What's left of an order after every cost that changes when you sell one more unit. Gross margin only removes COGS — contribution also removes shipping, fees, returns, and service, which is why it's the honest number for ads.",
    ref: '§2.1',
  },
  requiredContribution: {
    term: 'Required contribution after ads',
    plain:
      'The profit you demand per order once advertising is paid for. Setting it to zero means the campaign only ever breaks even by design.',
    ref: '§2.2',
  },
  collectedContribution: {
    term: 'Collected contribution',
    plain:
      'Money that actually arrived, not contracts signed. Settlements fall through, procurement stalls, invoices go unpaid — plan on cash, not paper.',
    ref: '§2.5',
  },
  funnelRates: {
    term: 'Funnel stage rates',
    plain:
      'The share of leads surviving each step. Multiplying them prices the decay: at 40% × 50% × 25%, only 1 in 20 raw leads becomes revenue.',
    ref: '§2.5',
  },
  discountRate: {
    term: 'Discount rate',
    plain:
      "Future money is worth less than money today. Discounting retention revenue keeps you from overvaluing customers who pay you slowly.",
    ref: '§2.3',
  },
  retention: {
    term: 'Retention / churn',
    plain:
      'How long customers keep paying. Expressed either as average months retained or as the % lost each month — they are two views of the same decay curve.',
    ref: '§2.3',
  },
  plannedSpend: {
    term: 'Planned monthly spend',
    plain:
      'Used for the cash schedule, not the unit math: spend × payback months approximates how much cash sits unrecouped while you scale.',
    ref: '§2.4',
  },
  emq: {
    term: 'EMQ — Event Match Quality',
    plain:
      "Meta's 0–10 score for how well your events identify real people. Low EMQ means Meta optimizes and reports on a blurry picture of your customers.",
    ref: '§5.4',
  },
  dedup: {
    term: 'event_id deduplication',
    plain:
      'Browser and server both report the same purchase; a shared event_id (built from the order number) tells Meta they are one event, not two. Without it every count is silently wrong.',
    ref: '§5.3',
  },
  capi: {
    term: 'Conversions API (CAPI)',
    plain:
      'Server-to-Meta event delivery that survives ad blockers and browser privacy limits. Stock plug-and-play apps typically drop events and pass few match parameters.',
    ref: '§5.2',
  },
  receiptRatio: {
    term: 'Receipt ratio',
    plain:
      'Received events ÷ backend records, for the same window. It checks the pipe, not attribution — Ads Manager conversions are a different layer and will never match your backend 1:1.',
    ref: '§5.1',
  },
  attributionSetting: {
    term: 'Attribution setting',
    plain:
      "The rule deciding which conversions Meta claims credit for (e.g. 7-day click). Change the rule and the numbers change — so it's recorded here to keep future comparisons honest.",
    ref: '§6.1',
  },
  viewThrough: {
    term: 'View-through conversions',
    plain:
      'Conversions from people who saw the ad but never clicked. Above ~50% of the total, most of the reported result comes from people the ad may not have influenced at all.',
    ref: '§6.2',
  },
  optimizationEvent: {
    term: 'Optimization event',
    plain:
      'The action Meta hunts for. Meta will get you exactly what you ask for — pick an event that predicts business value, not one that merely fills a dashboard.',
    ref: '§3.2',
  },
  targetCpa: {
    term: 'Target CPA',
    plain:
      'What you intend to pay per optimization event. Feeds the feasibility math: 50 weekly events × CPA ÷ 7 is the minimum stable daily budget per ad set.',
    ref: '§3.3',
  },
  budgetStrategy: {
    term: 'CBO vs ABO',
    plain:
      'CBO lets Meta split the budget across ad sets; ABO fixes it per ad set. CBO chases attributed ROAS — dangerous when prospecting and retargeting share a campaign, because retargeting always looks cheaper than it is.',
    ref: '§4.3',
  },
  learningPhase: {
    term: 'Learning phase',
    plain:
      "Meta's exploration period after launch or big edits. Ad sets unlikely to reach ~50 optimization events in a week stay delivery-unstable — data from them looks usable but isn't.",
    ref: '§3.3',
  },
  preRegistration: {
    term: 'Pre-registration',
    plain:
      'Writing down what result would change your mind before seeing any data. It is the only defense against re-interpreting every outcome as a win.',
    ref: '§7.9',
  },
  earningLearning: {
    term: 'EARNING vs LEARNING',
    plain:
      "Delivery optimization and experiments are enemies: optimization shifts spend toward predicted winners, which destroys the clean comparison a test needs. Pick one job per campaign.",
    ref: '§3.7',
  },
  dpa: {
    term: 'DPA — data processing agreement',
    plain:
      "The contract authorizing you to send the client's customer data to Meta. Sending event data without one is a liability, not a technicality.",
    ref: 'ch. 12',
  },
  consentGating: {
    term: 'Consent gating',
    plain:
      'Events only fire for users who consented to tracking. Required under GDPR-style regimes — and non-negotiable in this form.',
    ref: 'ch. 12',
  },
  backendAccess: {
    term: 'Backend data access',
    plain:
      "Read access to the client's real revenue or CRM outcomes. Without it, the only scoreboard is Meta grading its own homework.",
    ref: '§5.1',
  },
};
