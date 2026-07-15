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
import { emptyS5, s5Schema } from './sections/s5-audience';
import { emptyS6, s6Schema } from './sections/s6-offer';
import { emptyS7, s7Schema } from './sections/s7-creative';
import { emptyS8, s8Schema } from './sections/s8-assets';
import { emptyS9, s9Schema } from './sections/s9-policy';
import { emptyS10, s10Schema } from './sections/s10-experiment';
import { emptyS11, s11Schema } from './sections/s11-postclick';
import { emptyS12, s12Schema } from './sections/s12-measurement';
import { emptyS13, s13Schema } from './sections/s13-signoff';

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
  s5: s5Schema,
  s6: s6Schema,
  s7: s7Schema,
  s8: s8Schema,
  s9: s9Schema,
  s10: s10Schema,
  s11: s11Schema,
  s12: s12Schema,
  s13: s13Schema,
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
    s5: emptyS5(),
    s6: emptyS6(),
    s7: emptyS7(),
    s8: emptyS8(),
    s9: emptyS9(),
    s10: emptyS10(),
    s11: emptyS11(),
    s12: emptyS12(),
    s13: emptyS13(),
    acknowledgments: {},
    overrides: {},
  };
}

/** Whether the experiment plan (S10) is mandatory for this brief. */
export function experimentRequired(values: BriefFormValues): boolean {
  return (
    values.s2.purpose === 'LEARNING' ||
    values.s0.campaignIntent === 'AWARENESS'
  );
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
  const { s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13 } = values;
  const awareness = s0.campaignIntent === 'AWARENESS';

  // S0 — engagement basics
  if (!s0.clientName.trim()) missing(ctx, ['s0', 'clientName'], 'Client name is required.');
  if (!s0.vertical) missing(ctx, ['s0', 'vertical'], 'Vertical is required.');
  if (!s0.businessModel) missing(ctx, ['s0', 'businessModel'], 'Business model is required.');
  if (!s0.campaignIntent) missing(ctx, ['s0', 'campaignIntent'], 'Campaign intent (direct response vs awareness) is required.');
  if (!s0.engagementStart) missing(ctx, ['s0', 'engagementStart'], 'Engagement start date is required.');
  if (!s0.mediaLead.trim()) missing(ctx, ['s0', 'mediaLead'], 'Media lead is required.');
  if (!s0.backendDataAccess) missing(ctx, ['s0', 'backendDataAccess'], 'Backend data access must be declared.');

  // S1 — DR: contribution build; AWARENESS: investment rationale
  const build = requiredBuildFor(s0.vertical);
  if (awareness) {
    if (s1.awareness.plannedMonthlyBudget === null)
      missing(ctx, ['s1', 'awareness', 'plannedMonthlyBudget'], 'Planned monthly budget is required.');
    if (!s1.awareness.futureValueHypothesis.trim())
      missing(ctx, ['s1', 'awareness', 'futureValueHypothesis'], 'Write the future-value hypothesis: what future cash flow is this spend buying?');
  } else {
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
  if (!awareness && s4.expectedWeeklyEventVolume === null)
    missing(ctx, ['s4', 'expectedWeeklyEventVolume'], 'Expected weekly event volume is required.');
  if (!s4.budgetStrategy) missing(ctx, ['s4', 'budgetStrategy'], 'Budget strategy is required.');
  if (s4.campaignDailyBudget === null) missing(ctx, ['s4', 'campaignDailyBudget'], 'Daily budget is required.');
  if (!awareness && s4.targetCpa === null)
    missing(ctx, ['s4', 'targetCpa'], 'Target CPA is required for feasibility math.');
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

  // S5 — audience
  if (!s5.geography.trim()) missing(ctx, ['s5', 'geography'], 'Geography is required.');

  // S6 — offer
  if (!s6.offerType) missing(ctx, ['s6', 'offerType'], 'Declare the offer (or "No offer").');
  if (
    (s6.offerType === 'PERCENTAGE_DISCOUNT' || s6.offerType === 'FIXED_DISCOUNT') &&
    s6.discount.value === null
  )
    missing(ctx, ['s6', 'discount', 'value'], 'Discount magnitude is required for a discount offer.');

  // S7 — creative brief
  if (!s7.awarenessLevel) missing(ctx, ['s7', 'awarenessLevel'], 'Awareness level is required.');
  if (!s7.categoryEntryPoint.trim())
    missing(ctx, ['s7', 'categoryEntryPoint'], 'Name the buying situation this creative targets.');
  if (!s7.proposition.trim()) missing(ctx, ['s7', 'proposition'], 'The proposition is required.');
  if (s7.proposition.length > 140)
    missing(ctx, ['s7', 'proposition'], 'One clear promise — 140 characters max.');
  if (s7.hookVariants.filter((hook) => hook.text.trim()).length < 3)
    missing(ctx, ['s7', 'hookVariants'], 'At least 3 hook variants are required.');
  if (!s7.primaryCta.trim()) missing(ctx, ['s7', 'primaryCta'], 'Primary CTA is required.');
  if (!s7.destinationUrl.trim()) missing(ctx, ['s7', 'destinationUrl'], 'Destination URL is required.');

  // S8 — creative tagging: not optional, cannot be skipped
  if (s8.assets.length === 0)
    missing(ctx, ['s8', 'assets'], 'Tag at least one creative asset — this section creates the regression dataset.');
  s8.assets.forEach((asset, index) => {
    if (!asset.assetRef.trim())
      missing(ctx, ['s8', 'assets', index, 'assetRef'], 'Asset reference is required.');
    if (!asset.conceptId.trim())
      missing(ctx, ['s8', 'assets', index, 'conceptId'], 'Concept ID is required.');
    if (!asset.testRole) missing(ctx, ['s8', 'assets', index, 'testRole'], 'Test role is required.');
    const tags = asset.tags;
    (['format', 'hookType', 'firstFrame', 'proofType', 'offerShown', 'lengthBucket', 'cta'] as const).forEach(
      (key) => {
        if (!tags[key]) missing(ctx, ['s8', 'assets', index, 'tags', key], `Tag "${key}" is required — every field, every asset.`);
      },
    );
    if (tags.brandIn2s === null)
      missing(ctx, ['s8', 'assets', index, 'tags', 'brandIn2s'], 'Brand-in-first-2s must be answered.');
    if (tags.aspectRatios.length === 0)
      missing(ctx, ['s8', 'assets', index, 'tags', 'aspectRatios'], 'At least one aspect ratio.');
  });

  // S9 — policy pre-flight
  if (!s9.specialAdCategory)
    missing(ctx, ['s9', 'specialAdCategory'], 'Special Ad Category must be classified (on the offer, not the industry label).');
  const hookIds = new Set(s7.hookVariants.filter((h) => h.text.trim()).map((h) => h.id));
  const confirmed = new Set(s9.hookReviews.filter((r) => r.confirmed).map((r) => r.hookId));
  for (const hookId of hookIds) {
    if (!confirmed.has(hookId)) {
      missing(ctx, ['s9', 'hookReviews'], 'Every hook variant needs a personal-attributes review confirmation.');
      break;
    }
  }
  if (!s9.restrictedContentChecked)
    missing(ctx, ['s9', 'restrictedContentChecked'], 'Restricted-content check must be confirmed.');
  if (!s9.reviewedBy.trim()) missing(ctx, ['s9', 'reviewedBy'], 'Policy review needs a named reviewer.');
  if (!s9.reviewedOn) missing(ctx, ['s9', 'reviewedOn'], 'Policy review needs a date.');

  // S10 — experiment plan (when LEARNING or AWARENESS)
  if (experimentRequired(values)) {
    if (!s10.estimand.trim()) missing(ctx, ['s10', 'estimand'], 'State the estimand: who, treatment contrast, outcome, window.');
    if (!s10.design) missing(ctx, ['s10', 'design'], 'Pick an experiment design.');
    if (s10.power.baselineRatePct === null)
      missing(ctx, ['s10', 'power', 'baselineRatePct'], 'Baseline rate is required for the power calculation.');
    if (s10.power.mdeRelativePct === null)
      missing(ctx, ['s10', 'power', 'mdeRelativePct'], 'Minimum detectable effect is required.');
    if (s10.dailyTestBudget === null)
      missing(ctx, ['s10', 'dailyTestBudget'], 'Daily test budget is required to estimate days-to-complete.');
    if (!s10.stoppingRule) missing(ctx, ['s10', 'stoppingRule'], 'Pick a stopping rule — fixed horizon or sequential.');
    if (s10.stoppingRule === 'SEQUENTIAL' && !s10.sequentialMethod.trim())
      missing(ctx, ['s10', 'sequentialMethod'], 'Name the sequential method (alpha spending, group-sequential, always-valid…).');
    if (!s10.decisionRule.trim()) missing(ctx, ['s10', 'decisionRule'], 'Pre-commit the decision rule.');
    if (!s10.noPeekingAttestation)
      missing(ctx, ['s10', 'noPeekingAttestation'], 'Confirm the no-peeking commitment.');
  }

  // S11 — post-click
  if (s11.messageMatch.confirmed === null)
    missing(ctx, ['s11', 'messageMatch', 'confirmed'], 'Message match must be assessed.');
  if (s11.checkoutTested.tested === null)
    missing(ctx, ['s11', 'checkoutTested', 'tested'], 'Checkout/form test status is required.');
  if (s11.inventoryConfirmed === null)
    missing(ctx, ['s11', 'inventoryConfirmed'], 'Inventory availability must be confirmed.');
  if (build === 'leadGen' && !awareness) {
    if (s11.intake.medianFirstResponseMinutes === null)
      missing(ctx, ['s11', 'intake', 'medianFirstResponseMinutes'], 'Median first-response time is required for lead gen.');
    if (s11.intake.capacityUtilizationPct === null)
      missing(ctx, ['s11', 'intake', 'capacityUtilizationPct'], 'Capacity utilization is required for lead gen.');
  }

  // S12 — measurement & decision plan
  if (!s12.primaryMetric) missing(ctx, ['s12', 'primaryMetric'], 'Primary business metric is required.');
  if (!s12.reportingCommitment)
    missing(ctx, ['s12', 'reportingCommitment'], 'The backend-first reporting commitment must be confirmed.');
  if (!s12.reviewDate) missing(ctx, ['s12', 'reviewDate'], 'A review date is required.');
  if (!s12.killCriteria.trim()) missing(ctx, ['s12', 'killCriteria'], 'Kill criteria are required: what result stops this campaign?');
  if (!s12.preRegisteredExpectation.trim())
    missing(ctx, ['s12', 'preRegisteredExpectation'], 'Pre-register your expectation, in numbers, before seeing data.');

  // S13 — sign-off
  if (!s13.mediaLead.name.trim()) missing(ctx, ['s13', 'mediaLead', 'name'], 'Media lead sign-off is required.');
  if (!s13.mediaLead.date) missing(ctx, ['s13', 'mediaLead', 'date'], 'Sign-off date is required.');
}

export const briefSubmitSchema = briefFormSchema.superRefine(submitRequiredness);
