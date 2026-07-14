/**
 * The declarative gate registry — the part that grows for years.
 * No JSX, no ifs scattered through components: one definition per rule,
 * grouped by section. Ids are stable forever (they key overrides/acks).
 */
import { isNum } from '../calc/round';
import type { GateDefinition } from './types';

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
    evaluate: ({ calc }) =>
      isNum(calc.targets.breakEvenRoas) && calc.targets.breakEvenRoas > 6
        ? { meta: { breakEvenRoas: calc.targets.breakEvenRoas } }
        : null,
  },
  {
    id: 'G-S1-TARGET-LTE-BREAKEVEN',
    section: 's1',
    level: 'BLOCKING',
    overridable: true,
    evaluate: ({ calc }) => {
      const { targetRoas, breakEvenRoas, allowableCac } = calc.targets;
      // Negative/zero allowable CAC is the same impossibility.
      if (calc.build === 'ecom' && isNum(allowableCac) && allowableCac <= 0) {
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
    evaluate: ({ calc }) =>
      isNum(calc.targets.breakEvenRoas) &&
      calc.targets.breakEvenRoas >= 4 &&
      calc.targets.breakEvenRoas <= 6
        ? { meta: { breakEvenRoas: calc.targets.breakEvenRoas } }
        : null,
  },
  {
    id: 'G-S1-LTVCAC-LT2',
    section: 's1',
    level: 'WARNING',
    overridable: true,
    evaluate: ({ calc }) =>
      isNum(calc.ltv.ltvToCac) && calc.ltv.ltvToCac < 2
        ? { meta: { ltvToCac: calc.ltv.ltvToCac } }
        : null,
  },
  {
    id: 'G-S1-PAYBACK-GT6MO',
    section: 's1',
    level: 'WARNING',
    overridable: true,
    evaluate: ({ brief, calc }) =>
      isNum(calc.ltv.paybackMonthsFractional) &&
      calc.ltv.paybackMonthsFractional > 6 &&
      !brief.s1.ltv.cashBufferConfirmed
        ? { meta: { paybackMonths: calc.ltv.paybackMonthsFractional } }
        : null,
  },
  {
    id: 'G-S1-SUB-FIRST-ORDER',
    section: 's1',
    level: 'INFO',
    overridable: true,
    evaluate: ({ brief, calc }) =>
      brief.s0.businessModel === 'SUBSCRIPTION' &&
      isNum(calc.targets.targetRoas) &&
      calc.targets.targetRoas < 1
        ? { meta: { targetRoas: calc.targets.targetRoas } }
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
  {
    id: 'G-S2-LEARNING-NO-TESTLOG',
    section: 's2',
    level: 'BLOCKING',
    overridable: true, // slice 2 replaces this with the experiment designer
    evaluate: ({ brief }) => (brief.s2.purpose === 'LEARNING' ? {} : null),
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

export const GATE_DEFINITIONS: GateDefinition[] = [
  ...s0Gates,
  ...s1Gates,
  ...s2Gates,
  ...s3Gates,
  ...s4Gates,
];
