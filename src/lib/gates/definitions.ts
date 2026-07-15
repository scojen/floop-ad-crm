/**
 * The declarative gate registry — the part that grows for years.
 * No JSX, no ifs scattered through components: one definition per rule,
 * grouped by section. Ids are stable forever (they key overrides/acks).
 */
import { isNum } from '../calc/round';
import { lintHooks } from './hook-linter';
import type { GateDefinition, GateContext } from './types';

/** Economics gates don't apply to awareness-intent briefs. */
const directResponse = ({ brief }: GateContext) =>
  brief.s0.campaignIntent !== 'AWARENESS';

const s0Gates: GateDefinition[] = [
  {
    id: 'G-S0-BACKEND-NONE',
    section: 's0',
    level: 'BLOCKING',
    overridable: true,
    evaluate: ({ brief }) =>
      brief.s0.backendDataAccess === 'none' ? {} : null,
  },
];

const s1Gates: GateDefinition[] = [
  {
    id: 'G-S1-BE-ROAS-GT6',
    section: 's1',
    level: 'BLOCKING',
    overridable: true,
    evaluate: (ctx) =>
      directResponse(ctx) &&
      isNum(ctx.calc.targets.breakEvenRoas) &&
      ctx.calc.targets.breakEvenRoas > 6
        ? { meta: { breakEvenRoas: ctx.calc.targets.breakEvenRoas } }
        : null,
  },
  {
    id: 'G-S1-AW-NO-GUARDRAIL',
    section: 's1',
    level: 'WARNING',
    overridable: true,
    evaluate: ({ brief }) =>
      brief.s0.campaignIntent === 'AWARENESS' &&
      isNum(brief.s1.awareness.plannedMonthlyBudget) &&
      !isNum(brief.s1.awareness.spendGuardrail.value)
        ? {}
        : null,
  },
  {
    id: 'G-S1-TARGET-LTE-BREAKEVEN',
    section: 's1',
    level: 'BLOCKING',
    overridable: true,
    evaluate: (ctx) => {
      if (!directResponse(ctx)) return null;
      const { targetRoas, breakEvenRoas, allowableCac } = ctx.calc.targets;
      // Negative/zero allowable CAC is the same impossibility.
      if (ctx.calc.build === 'ecom' && isNum(allowableCac) && allowableCac <= 0) {
        return { meta: { targetRoas: '∞', breakEvenRoas: breakEvenRoas ?? '?' } };
      }
      if (isNum(targetRoas) && isNum(breakEvenRoas) && targetRoas <= breakEvenRoas) {
        return { meta: { targetRoas, breakEvenRoas } };
      }
      return null;
    },
  },
  {
    id: 'G-S1-BE-ROAS-4TO6',
    section: 's1',
    level: 'WARNING',
    overridable: true,
    evaluate: (ctx) =>
      directResponse(ctx) &&
      isNum(ctx.calc.targets.breakEvenRoas) &&
      ctx.calc.targets.breakEvenRoas >= 4 &&
      ctx.calc.targets.breakEvenRoas <= 6
        ? { meta: { breakEvenRoas: ctx.calc.targets.breakEvenRoas } }
        : null,
  },
  {
    id: 'G-S1-LTVCAC-LT2',
    section: 's1',
    level: 'WARNING',
    overridable: true,
    evaluate: (ctx) =>
      directResponse(ctx) &&
      isNum(ctx.calc.ltv.ltvToCac) &&
      ctx.calc.ltv.ltvToCac < 2
        ? { meta: { ltvToCac: ctx.calc.ltv.ltvToCac } }
        : null,
  },
  {
    id: 'G-S1-PAYBACK-GT6MO',
    section: 's1',
    level: 'WARNING',
    overridable: true,
    evaluate: (ctx) =>
      directResponse(ctx) &&
      isNum(ctx.calc.ltv.paybackMonthsFractional) &&
      ctx.calc.ltv.paybackMonthsFractional > 6 &&
      !ctx.brief.s1.ltv.cashBufferConfirmed
        ? { meta: { paybackMonths: ctx.calc.ltv.paybackMonthsFractional } }
        : null,
  },
  {
    id: 'G-S1-SUB-FIRST-ORDER',
    section: 's1',
    level: 'INFO',
    overridable: true,
    evaluate: (ctx) =>
      directResponse(ctx) &&
      ctx.brief.s0.businessModel === 'SUBSCRIPTION' &&
      isNum(ctx.calc.targets.targetRoas) &&
      ctx.calc.targets.targetRoas < 1
        ? { meta: { targetRoas: ctx.calc.targets.targetRoas } }
        : null,
  },
];

const s2Gates: GateDefinition[] = [
  {
    id: 'G-S2-PREREG-EMPTY',
    section: 's2',
    level: 'BLOCKING',
    overridable: true,
    evaluate: ({ brief }) => {
      // Only fires once the user has committed to a purpose — a blank new
      // draft shouldn't open with a wall of red.
      if (!brief.s2.purpose) return null;
      return brief.s2.changeOurMind.text.trim() === '' ||
        !brief.s2.changeOurMind.decisionDate
        ? {}
        : null;
    },
  },
];

const s3Gates: GateDefinition[] = [
  {
    id: 'G-S3-PIXEL-FAIL',
    section: 's3',
    level: 'BLOCKING',
    overridable: true,
    evaluate: ({ brief }) =>
      brief.s3.pixelFiring.status === 'fail'
        ? { meta: { status: 'fail' } }
        : null,
  },
  {
    id: 'G-S3-CAPI-PLATFORM-APP',
    section: 's3',
    level: 'WARNING',
    overridable: true,
    evaluate: ({ brief }) =>
      brief.s3.capiMode === 'platform_app' ? {} : null,
  },
  {
    id: 'G-S3-DEDUP-FAIL',
    section: 's3',
    level: 'BLOCKING',
    overridable: true,
    evaluate: ({ brief }) =>
      brief.s3.eventIdDedup.status === 'fail' ? {} : null,
  },
  {
    id: 'G-S3-EMQ',
    section: 's3',
    level: 'BLOCKING', // downgraded to WARNING in evaluate for 5–7
    overridable: true,
    evaluate: ({ brief }) => {
      const score = brief.s3.emqScore;
      if (!isNum(score)) return null;
      if (score < 5) return { meta: { emqScore: score, threshold: 5 } };
      return null;
    },
  },
  {
    id: 'G-S3-EMQ-WARN',
    section: 's3',
    level: 'WARNING',
    overridable: true,
    evaluate: ({ brief }) => {
      const score = brief.s3.emqScore;
      if (!isNum(score)) return null;
      if (score >= 5 && score < 7)
        return { meta: { emqScore: score, threshold: 7 } };
      return null;
    },
  },
  {
    id: 'G-S3-RECEIPT-RATIO',
    section: 's3',
    level: 'BLOCKING',
    overridable: true,
    evaluate: ({ calc }) =>
      isNum(calc.receiptRatio) &&
      (calc.receiptRatio > 1.15 || calc.receiptRatio < 0.7)
        ? { meta: { ratio: calc.receiptRatio } }
        : null,
  },
  {
    id: 'G-S3-CRM-CAPI',
    section: 's3',
    level: 'BLOCKING',
    overridable: true,
    evaluate: ({ brief, calc }) =>
      calc.build === 'leadGen' && brief.s3.crm.connected === false ? {} : null,
  },
  {
    id: 'G-S3-PRIVACY',
    section: 's3',
    level: 'BLOCKING',
    overridable: false, // the one gate no justification can open
    evaluate: ({ brief }) => {
      const p = brief.s3.privacy;
      const missing: string[] = [];
      if (p.dpaExecuted === false) missing.push('DPA');
      if (p.consentGating === false) missing.push('consent gating');
      // The attestation only blocks once privacy is being answered at all —
      // submit-requiredness catches it regardless.
      if (
        (p.dpaExecuted !== null || p.consentGating !== null) &&
        !p.prohibitedDataAttestation
      ) {
        missing.push('prohibited-data attestation');
      }
      return missing.length > 0 ? { meta: { missing: missing.join(', ') } } : null;
    },
  },
  {
    id: 'G-S3-ATTR-NOT-RECORDED',
    section: 's3',
    level: 'BLOCKING',
    overridable: true,
    evaluate: ({ brief }) => {
      // Fires once any measurement work has begun but attribution is blank.
      const touched =
        brief.s3.pixelFiring.status !== null || brief.s3.capiMode !== null;
      return touched && !brief.s3.attribution.setting ? {} : null;
    },
  },
  {
    id: 'G-S3-VIEWTHROUGH-GT50',
    section: 's3',
    level: 'WARNING',
    overridable: true,
    evaluate: ({ brief }) =>
      isNum(brief.s3.attribution.viewThroughSharePct) &&
      brief.s3.attribution.viewThroughSharePct > 50
        ? { meta: { share: brief.s3.attribution.viewThroughSharePct } }
        : null,
  },
];

const s4Gates: GateDefinition[] = [
  {
    id: 'G-S4-CBO-MIXED-FUNNEL',
    section: 's4',
    level: 'BLOCKING',
    overridable: true,
    evaluate: ({ brief }) => {
      if (brief.s4.budgetStrategy !== 'CBO') return null;
      const purposes = new Set(
        brief.s4.adSets.map((adSet) => adSet.purpose).filter(Boolean),
      );
      return purposes.has('PROSPECTING') && purposes.has('RETARGETING')
        ? {}
        : null;
    },
  },
  {
    id: 'G-S4-ADSETS-EXCEED',
    section: 's4',
    level: 'BLOCKING',
    overridable: true,
    evaluate: ({ brief, calc }) => {
      const max = calc.learning.maxSupportableAdSets;
      const declared = brief.s4.adSets.length;
      return isNum(max) && declared > max * 1.2
        ? { meta: { maxSupportable: max, declared } }
        : null;
    },
  },
  {
    id: 'G-S4-LEARNING-INFEASIBLE',
    section: 's4',
    level: 'WARNING',
    overridable: true,
    evaluate: ({ brief, calc }) => {
      const max = calc.learning.maxSupportableAdSets;
      if (!isNum(max) || max >= 1) return null;
      const fieldsSatisfied =
        brief.s4.decisionWindowDays !== null &&
        brief.s4.uncertaintyDisclosure.sent !== null;
      return {
        meta: {
          weeklyEvents: calc.learning.projectedWeeklyEvents ?? 0,
        },
        fieldsSatisfied,
      };
    },
  },
  {
    id: 'G-S4-EVENT-VOLUME-LT50',
    section: 's4',
    level: 'WARNING',
    overridable: true,
    evaluate: ({ brief }) =>
      isNum(brief.s4.expectedWeeklyEventVolume) &&
      brief.s4.expectedWeeklyEventVolume < 50
        ? { meta: { volume: brief.s4.expectedWeeklyEventVolume } }
        : null,
  },
];

const s5Gates: GateDefinition[] = [
  {
    id: 'G-S5-NO-PURCHASER-EXCLUSION',
    section: 's5',
    level: 'WARNING',
    overridable: true,
    evaluate: (ctx) => {
      if (!directResponse(ctx)) return null;
      const hasProspecting = ctx.brief.s4.adSets.some(
        (adSet) => adSet.purpose === 'PROSPECTING',
      );
      return hasProspecting && ctx.brief.s5.exclusions.length === 0 ? {} : null;
    },
  },
];

const s6Gates: GateDefinition[] = [
  {
    id: 'G-S6-OFFER-BREAKS-ECONOMICS',
    section: 's6',
    level: 'BLOCKING',
    overridable: true,
    evaluate: ({ calc }) => {
      const before = calc.targets.breakEvenRoas;
      const after = calc.offer?.targets.breakEvenRoas ?? null;
      return isNum(before) && isNum(after) && before <= 6 && after > 6
        ? { meta: { before, after } }
        : null;
    },
  },
];

const s7Gates: GateDefinition[] = [
  {
    id: 'G-S7-AWARENESS-CONCENTRATION',
    section: 's7',
    level: 'WARNING',
    overridable: true,
    evaluate: ({ brief }) =>
      brief.s7.awarenessLevel === 'PRODUCT_AWARE' ||
      brief.s7.awarenessLevel === 'MOST_AWARE'
        ? {}
        : null,
  },
];

const s8Gates: GateDefinition[] = [
  {
    id: 'G-S8-CONCEPT-CONCENTRATION',
    section: 's8',
    level: 'WARNING',
    overridable: true,
    evaluate: ({ brief }) => {
      if (brief.s8.assets.length === 0) return null;
      const concepts = new Set(
        brief.s8.assets.map((asset) => asset.conceptId.trim()).filter(Boolean),
      );
      return concepts.size > 0 && concepts.size < 3
        ? { meta: { concepts: concepts.size } }
        : null;
    },
  },
];

const s9Gates: GateDefinition[] = [
  {
    id: 'G-S9-HOOK-ATTRIBUTES',
    section: 's9',
    level: 'WARNING',
    overridable: true,
    evaluate: ({ brief }) => {
      const hits = lintHooks(brief.s7.hookVariants);
      return hits.length > 0
        ? {
            meta: {
              count: hits.length,
              examples: hits
                .slice(0, 2)
                .map((hit) => `"${hit.text.slice(0, 60)}" (${hit.keywords.join(', ')})`)
                .join(' · '),
            },
          }
        : null;
    },
  },
  {
    id: 'G-S9-SPECIAL-CATEGORY',
    section: 's9',
    level: 'INFO',
    overridable: true,
    evaluate: ({ brief }) =>
      brief.s9.specialAdCategory && brief.s9.specialAdCategory !== 'NONE'
        ? { meta: { category: brief.s9.specialAdCategory } }
        : null,
  },
];

const s10Gates: GateDefinition[] = [
  {
    id: 'G-S10-REQUIRED-INCOMPLETE',
    section: 's10',
    level: 'BLOCKING',
    overridable: true,
    evaluate: ({ brief, calc }) => {
      if (!calc.experimentRequired) return null;
      const s10 = brief.s10;
      const incomplete =
        !s10.estimand.trim() ||
        !s10.design ||
        s10.power.baselineRatePct === null ||
        !s10.stoppingRule ||
        !s10.decisionRule.trim();
      return incomplete
        ? {
            meta: {
              reason:
                brief.s0.campaignIntent === 'AWARENESS'
                  ? 'awareness spend is unmeasurable without a lift plan'
                  : 'LEARNING purpose requires a pre-registered experiment',
            },
          }
        : null;
    },
  },
  {
    id: 'G-S10-DAYS-GT45',
    section: 's10',
    level: 'BLOCKING',
    overridable: true,
    evaluate: ({ calc }) =>
      isNum(calc.experiment?.estDaysToComplete ?? null) &&
      (calc.experiment?.estDaysToComplete as number) > 45
        ? { meta: { days: calc.experiment!.estDaysToComplete as number } }
        : null,
  },
  {
    id: 'G-S10-OBSERVATIONAL',
    section: 's10',
    level: 'WARNING',
    overridable: true,
    evaluate: ({ brief }) =>
      brief.s10.design === 'OBSERVATIONAL' ? {} : null,
  },
];

const s11Gates: GateDefinition[] = [
  {
    id: 'G-S11-CHECKOUT-UNTESTED',
    section: 's11',
    level: 'BLOCKING',
    overridable: true,
    evaluate: ({ brief }) =>
      brief.s11.checkoutTested.tested === false ? {} : null,
  },
  {
    id: 'G-S11-LCP-SLOW',
    section: 's11',
    level: 'WARNING',
    overridable: true,
    evaluate: ({ brief }) =>
      isNum(brief.s11.lcpSecondsMobile) && brief.s11.lcpSecondsMobile > 2.5
        ? { meta: { lcp: brief.s11.lcpSecondsMobile } }
        : null,
  },
  {
    id: 'G-S11-P90-RESPONSE',
    section: 's11',
    level: 'WARNING',
    overridable: true,
    evaluate: ({ brief, calc }) =>
      calc.build === 'leadGen' &&
      isNum(brief.s11.intake.p90FirstResponseMinutes) &&
      brief.s11.intake.p90FirstResponseMinutes > 1440
        ? { meta: { p90h: Math.round(brief.s11.intake.p90FirstResponseMinutes / 60) } }
        : null,
  },
  {
    id: 'G-S11-CAPACITY',
    section: 's11',
    level: 'BLOCKING',
    overridable: true,
    evaluate: ({ brief, calc }) =>
      calc.build === 'leadGen' &&
      isNum(brief.s11.intake.capacityUtilizationPct) &&
      brief.s11.intake.capacityUtilizationPct > 95
        ? { meta: { utilization: brief.s11.intake.capacityUtilizationPct } }
        : null,
  },
];

const s12Gates: GateDefinition[] = [
  {
    id: 'G-S12-PLATFORM-ROAS-PRIMARY',
    section: 's12',
    level: 'WARNING',
    overridable: true,
    evaluate: ({ brief }) =>
      brief.s12.primaryMetric === 'PLATFORM_ROAS' ? {} : null,
  },
];

export const GATE_DEFINITIONS: GateDefinition[] = [
  ...s0Gates,
  ...s1Gates,
  ...s2Gates,
  ...s3Gates,
  ...s4Gates,
  ...s5Gates,
  ...s6Gates,
  ...s7Gates,
  ...s8Gates,
  ...s9Gates,
  ...s10Gates,
  ...s11Gates,
  ...s12Gates,
];
