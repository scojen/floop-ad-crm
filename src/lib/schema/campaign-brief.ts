/**
 * The campaign brief schema — the form is a projection of this.
 *
 * Design: the BASE schema is lenient (every leaf nullable, drafts always
 * parse); SUBMIT strictness lives in `briefSubmitSchema` via superRefine.
 * Schema says "missing/malformed"; the gate engine says "bad for business".
 */
import { z } from 'zod';
import { emptyS0, requiredBuildFor, s0Schema } from './sections/s0-client';
import { emptyS1, s1Schema } from './sections/s1-economics';
import { emptyS2, s2Schema } from './sections/s2-objective';
import { emptyS3, s3Schema } from './sections/s3-measurement';
import { emptyS4, s4Schema } from './sections/s4-structure';

export const SCHEMA_VERSION = 1;

const ackSchema = z.object({ at: z.string(), actorId: z.string() });
const overrideSchema = z.object({
  justification: z.string(),
  actorId: z.string(),
  at: z.string(),
});

export const briefFormSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  s0: s0Schema,
  s1: s1Schema,
  s2: s2Schema,
  s3: s3Schema,
  s4: s4Schema,
  /** Keyed by gate id. Draft state — pruned of stale entries only at submit. */
  acknowledgments: z.record(z.string(), ackSchema),
  overrides: z.record(z.string(), overrideSchema),
});
export type BriefFormValues = z.infer<typeof briefFormSchema>;

export function emptyBrief(): BriefFormValues {
  return {
    schemaVersion: SCHEMA_VERSION,
    s0: emptyS0(),
    s1: emptyS1(),
    s2: emptyS2(),
    s3: emptyS3(),
    s4: emptyS4(),
    acknowledgments: {},
    overrides: {},
  };
}

/**
 * Single upgrade point for persisted payloads. Unknown/missing fields are
 * back-filled from the empty brief; a future schemaVersion bump migrates here.
 */
export function migratePayload(raw: unknown): BriefFormValues {
  const merged = deepMerge(
    emptyBrief() as unknown as Record<string, unknown>,
    (typeof raw === 'object' && raw !== null
      ? (raw as Record<string, unknown>)
      : {}) as Record<string, unknown>,
  );
  const parsed = briefFormSchema.safeParse(merged);
  return parsed.success ? parsed.data : emptyBrief();
}

function deepMerge(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const baseValue = out[key];
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      baseValue !== null &&
      typeof baseValue === 'object' &&
      !Array.isArray(baseValue)
    ) {
      out[key] = deepMerge(
        baseValue as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

// ---------- submit requiredness ----------

const missing = (ctx: z.RefinementCtx, path: (string | number)[], msg: string) =>
  ctx.addIssue({ code: 'custom', path, message: msg });

function submitRequiredness(values: BriefFormValues, ctx: z.RefinementCtx): void {
  const { s0, s1, s2, s3, s4 } = values;

  // S0 — engagement basics
  if (!s0.clientName.trim()) missing(ctx, ['s0', 'clientName'], 'Client name is required.');
  if (!s0.vertical) missing(ctx, ['s0', 'vertical'], 'Vertical is required.');
  if (!s0.businessModel) missing(ctx, ['s0', 'businessModel'], 'Business model is required.');
  if (!s0.engagementStart) missing(ctx, ['s0', 'engagementStart'], 'Engagement start date is required.');
  if (!s0.mediaLead.trim()) missing(ctx, ['s0', 'mediaLead'], 'Media lead is required.');
  if (!s0.backendDataAccess) missing(ctx, ['s0', 'backendDataAccess'], 'Backend data access must be declared.');

  // S1 — the required contribution build must be complete
  const build = requiredBuildFor(s0.vertical);
  if (build === 'ecom') {
    if (s1.ecom.aov === null) missing(ctx, ['s1', 'ecom', 'aov'], 'AOV is required.');
    if (s1.ecom.cogs === null) missing(ctx, ['s1', 'ecom', 'cogs'], 'COGS is required.');
  } else {
    if (s1.leadGen.contributionPerClose === null)
      missing(ctx, ['s1', 'leadGen', 'contributionPerClose'], 'Collected contribution per close is required.');
    for (const key of ['pQualGivenLeadPct', 'pApptGivenQualPct', 'pCloseGivenApptPct'] as const) {
      if (s1.leadGen[key] === null)
        missing(ctx, ['s1', 'leadGen', key], 'All three funnel stage rates are required.');
    }
  }
  if (s1.targets.requiredContributionAfterAds === null)
    missing(ctx, ['s1', 'targets', 'requiredContributionAfterAds'], 'Required contribution after ads is required.');
  if (s0.businessModel === 'SUBSCRIPTION') {
    if (s1.ltv.contributionPerMonth === null)
      missing(ctx, ['s1', 'ltv', 'contributionPerMonth'], 'LTV build is required for subscription businesses.');
    if (s1.ltv.retention.value === null)
      missing(ctx, ['s1', 'ltv', 'retention', 'value'], 'Retention (months or churn %) is required.');
    if (s1.ltv.plannedMonthlySpend === null)
      missing(ctx, ['s1', 'ltv', 'plannedMonthlySpend'], 'Planned monthly spend is required for the cash schedule.');
  }

  // S2 — the five questions + purpose
  if (!s2.businessOutcome.trim()) missing(ctx, ['s2', 'businessOutcome'], 'Question 1 is required.');
  if (!s2.economicConstraint.text.trim()) missing(ctx, ['s2', 'economicConstraint', 'text'], 'Question 2 is required.');
  if (!s2.signalProximity.trim()) missing(ctx, ['s2', 'signalProximity'], 'Question 3 is required.');
  if (!s2.causationEvidence.trim()) missing(ctx, ['s2', 'causationEvidence'], 'Question 4 is required.');
  if (!s2.changeOurMind.text.trim())
    missing(ctx, ['s2', 'changeOurMind', 'text'], 'The pre-registration ("what would change our mind") is required.');
  if (!s2.changeOurMind.decisionDate)
    missing(ctx, ['s2', 'changeOurMind', 'decisionDate'], 'A decision date is required.');
  if (!s2.purpose) missing(ctx, ['s2', 'purpose'], 'Choose EARNING or LEARNING — you cannot get both.');

  // S3 — every readiness item answered (quality judged by gates)
  if (!s3.pixelFiring.status) missing(ctx, ['s3', 'pixelFiring', 'status'], 'Pixel status must be assessed.');
  if (!s3.capiMode) missing(ctx, ['s3', 'capiMode'], 'Conversions API mode must be declared.');
  if (!s3.eventIdDedup.status) missing(ctx, ['s3', 'eventIdDedup', 'status'], 'Deduplication must be assessed.');
  if (s3.emqScore === null) missing(ctx, ['s3', 'emqScore'], 'Event Match Quality score is required.');
  if (s3.reconciliation.backendOrders7d === null)
    missing(ctx, ['s3', 'reconciliation', 'backendOrders7d'], 'Backend order/lead count is required.');
  if (s3.reconciliation.eventsManagerReceived7d === null)
    missing(ctx, ['s3', 'reconciliation', 'eventsManagerReceived7d'], 'Events Manager received count is required.');
  if (build === 'leadGen' && s3.crm.connected === null)
    missing(ctx, ['s3', 'crm', 'connected'], 'CRM → CAPI status is required for lead gen / B2B.');
  if (s3.privacy.dpaExecuted === null) missing(ctx, ['s3', 'privacy', 'dpaExecuted'], 'DPA status is required.');
  if (!s3.privacy.lawfulBasis.kind) missing(ctx, ['s3', 'privacy', 'lawfulBasis', 'kind'], 'Lawful basis is required.');
  if (s3.privacy.consentGating === null) missing(ctx, ['s3', 'privacy', 'consentGating'], 'Consent gating status is required.');
  if (!s3.privacy.prohibitedDataAttestation)
    missing(ctx, ['s3', 'privacy', 'prohibitedDataAttestation'], 'The prohibited-data attestation must be confirmed.');
  if (s3.privacy.retentionPolicyDocumented === null)
    missing(ctx, ['s3', 'privacy', 'retentionPolicyDocumented'], 'Retention policy status is required.');
  if (!s3.attribution.setting) missing(ctx, ['s3', 'attribution', 'setting'], 'The attribution setting must be recorded.');

  // S4 — structure
  if (!s4.objective) missing(ctx, ['s4', 'objective'], 'Objective is required.');
  if (!s4.conversionLocation) missing(ctx, ['s4', 'conversionLocation'], 'Conversion location is required.');
  if (!s4.performanceGoal) missing(ctx, ['s4', 'performanceGoal'], 'Performance goal is required.');
  if (!s4.optimizationEvent.name.trim())
    missing(ctx, ['s4', 'optimizationEvent', 'name'], 'The optimization event is the most important field on the page.');
  if (s4.whyThisEvent.trim().length < 100)
    missing(ctx, ['s4', 'whyThisEvent'], '"Why this event?" needs at least 100 characters of actual reasoning.');
  if (s4.expectedWeeklyEventVolume === null)
    missing(ctx, ['s4', 'expectedWeeklyEventVolume'], 'Expected weekly event volume is required.');
  if (!s4.budgetStrategy) missing(ctx, ['s4', 'budgetStrategy'], 'Budget strategy is required.');
  if (s4.campaignDailyBudget === null) missing(ctx, ['s4', 'campaignDailyBudget'], 'Daily budget is required.');
  if (s4.targetCpa === null) missing(ctx, ['s4', 'targetCpa'], 'Target CPA is required for feasibility math.');
  if (s4.adSets.length === 0) missing(ctx, ['s4', 'adSets'], 'Declare at least one ad set.');
  s4.adSets.forEach((adSet, index) => {
    if (!adSet.purpose) missing(ctx, ['s4', 'adSets', index, 'purpose'], 'Ad set purpose is required.');
    if (adSet.dailyBudget === null) missing(ctx, ['s4', 'adSets', index, 'dailyBudget'], 'Ad set budget is required.');
  });
  if (!s4.reportingWindow) missing(ctx, ['s4', 'reportingWindow'], 'Reporting window is required.');
  if (!s4.baselinePeriod.from || !s4.baselinePeriod.to)
    missing(ctx, ['s4', 'baselinePeriod'], 'Baseline comparison period is required.');
  if (!s4.attributionChangeAcknowledged)
    missing(ctx, ['s4', 'attributionChangeAcknowledged'], 'Confirm the comparison period does not span an attribution change.');
}

export const briefSubmitSchema = briefFormSchema.superRefine(submitRequiredness);
