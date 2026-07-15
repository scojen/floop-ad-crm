import { describe, expect, it } from 'vitest';
import { deriveCalcs } from './derive';
import {
  economicShapeFor,
  engineFor,
  requiredBuildFor,
  roasFramed,
} from '../schema/sections/s0-client';
import { emptyBrief, type BriefFormValues } from '../schema/campaign-brief';
import { evaluateGates } from '../gates/evaluate';

function brief(overrides: (b: BriefFormValues) => void): BriefFormValues {
  const values = emptyBrief();
  values.s0.campaignIntent = 'DIRECT_RESPONSE';
  values.s0.backendDataAccess = 'full';
  overrides(values);
  return values;
}

describe('economic shape mapping', () => {
  it('maps every vertical to its shape', () => {
    expect(economicShapeFor('DTC_ECOM', 'ONE_TIME')).toBe('PER_ORDER');
    expect(economicShapeFor('MARKETPLACE_ECOM', 'MARKETPLACE')).toBe('TAKE_RATE');
    expect(economicShapeFor('SUBSCRIPTION', 'SUBSCRIPTION')).toBe('SUBSCRIBER');
    expect(economicShapeFor('LEADGEN_LOCAL', 'HIGH_TICKET')).toBe('PIPELINE');
    expect(economicShapeFor('B2B_SAAS', 'SUBSCRIPTION')).toBe('PIPELINE');
    expect(economicShapeFor('APP', 'ONE_TIME')).toBe('APP');
    expect(economicShapeFor('SERVICES_BOOKINGS', 'REPEAT')).toBe('BOOKING');
    // A DTC brand on a subscription model is subscriber-shaped.
    expect(economicShapeFor('DTC_ECOM', 'SUBSCRIPTION')).toBe('SUBSCRIBER');
  });

  it('APP runs the chain engine (install → payer), not order math', () => {
    expect(engineFor('APP')).toBe('chain');
    expect(requiredBuildFor('APP')).toBe('leadGen');
    expect(roasFramed('APP')).toBe(false);
  });
});

describe('TAKE_RATE — marketplace keeps GMV × take%', () => {
  function marketplaceBrief() {
    return brief((b) => {
      b.s0.vertical = 'MARKETPLACE_ECOM';
      b.s0.businessModel = 'MARKETPLACE';
      b.s1.ecom.aov = 200; // GMV per transaction
      b.s1.ecom.takeRatePct = 15;
      b.s1.ecom.cogs = 4; // support/processing per transaction
      b.s1.targets.requiredContributionAfterAds = 10;
    });
  }

  it('computes contribution on the share, ROAS on GMV', () => {
    const calc = deriveCalcs(marketplaceBrief());
    // revenue share 200 × 15% = 30; contribution 30 − 4 = 26
    expect(calc.contribution.netRevenue).toBe(30);
    expect(calc.contribution.contribution).toBe(26);
    expect(calc.targets.allowableCac).toBe(16);
    // break-even ROAS on the full transaction value: 200 ÷ 26 ≈ 7.69x
    expect(calc.targets.breakEvenRoas).toBe(7.69);
  });

  it('warns when GMV is entered without a take rate', () => {
    const withRate = marketplaceBrief();
    const withoutRate = marketplaceBrief();
    withoutRate.s1.ecom.takeRatePct = null;
    const ids = (b: BriefFormValues) =>
      evaluateGates(b, deriveCalcs(b)).map((g) => g.id);
    expect(ids(withoutRate)).toContain('G-S1-TAKERATE-MISSING');
    expect(ids(withRate)).not.toContain('G-S1-TAKERATE-MISSING');
    // Without the rate the math silently assumes 100% of GMV:
    expect(deriveCalcs(withoutRate).contribution.contribution).toBe(196);
  });

  it('ignores a leftover take rate after a vertical flip', () => {
    const flipped = marketplaceBrief();
    flipped.s0.vertical = 'DTC_ECOM';
    flipped.s0.businessModel = 'ONE_TIME';
    // takeRatePct still 15 in the payload, but the shape is PER_ORDER now.
    expect(deriveCalcs(flipped).contribution.netRevenue).toBe(200);
  });
});

describe('APP — install → activation → payer × ARPPU', () => {
  it('EV per install and allowable CPI come from the chain engine', () => {
    const values = brief((b) => {
      b.s0.vertical = 'APP';
      b.s0.businessModel = 'ONE_TIME';
      b.s1.leadGen.contributionPerClose = 60; // contribution per payer
      b.s1.leadGen.pQualGivenLeadPct = 40; // activation rate
      b.s1.leadGen.pApptGivenQualPct = 100; // no trial step
      b.s1.leadGen.pCloseGivenApptPct = 10; // payer conversion
      b.s1.targets.requiredContributionAfterAds = 1;
    });
    const calc = deriveCalcs(values);
    expect(calc.shape).toBe('APP');
    // 60 × 0.40 × 1.0 × 0.10 = 2.40 per install
    expect(calc.evPerRawLead).toBe(2.4);
    expect(calc.allowableCpl).toBe(1.4);
    expect(calc.targets.breakEvenRoas).toBeNull();
  });

  it('does not demand a sales CRM or intake capacity from an app', () => {
    const values = brief((b) => {
      b.s0.vertical = 'APP';
      b.s0.businessModel = 'ONE_TIME';
      b.s3.crm.connected = false;
      b.s11.intake.capacityUtilizationPct = 99;
    });
    const ids = evaluateGates(values, deriveCalcs(values)).map((g) => g.id);
    expect(ids).not.toContain('G-S3-CRM-CAPI');
    expect(ids).not.toContain('G-S11-CAPACITY');
  });
});

describe('SUBSCRIBER — LTV-framed verdict', () => {
  function subscriberBrief() {
    return brief((b) => {
      b.s0.vertical = 'SUBSCRIPTION';
      b.s0.businessModel = 'SUBSCRIPTION';
      // First month intentionally sold at a loss-leader margin:
      b.s1.ecom.aov = 20;
      b.s1.ecom.cogs = 18;
      b.s1.targets.requiredContributionAfterAds = 0.5;
      b.s1.ltv.contributionPerMonth = 12;
      b.s1.ltv.retention = { mode: 'months', value: 10 };
      b.s1.ltv.plannedMonthlySpend = 5000;
    });
  }

  it('silences per-order ROAS gates — first-order loss can be a strategy', () => {
    const values = subscriberBrief();
    const calc = deriveCalcs(values);
    // First-order break-even ROAS is 10x — would block a PER_ORDER brief.
    expect(calc.targets.breakEvenRoas).toBe(10);
    const ids = evaluateGates(values, calc).map((g) => g.id);
    expect(ids).not.toContain('G-S1-BE-ROAS-GT6');
    expect(ids).not.toContain('G-S1-TARGET-LTE-BREAKEVEN');
  });

  it('blocks when lifetime value does not even cover CAC', () => {
    const values = subscriberBrief();
    // Meaningful CAC (first-order contribution 60 − required 10 = 50) vs a
    // gutted LTV: $4/month at 30% monthly churn ≈ $9 lifetime.
    values.s1.ecom.aov = 100;
    values.s1.ecom.cogs = 40;
    values.s1.targets.requiredContributionAfterAds = 10;
    values.s1.ltv.contributionPerMonth = 4;
    values.s1.ltv.retention = { mode: 'churnPct', value: 30 };
    const calc = deriveCalcs(values);
    expect(calc.ltv.ltvToCac).not.toBeNull();
    expect(calc.ltv.ltvToCac!).toBeLessThanOrEqual(1);
    const ids = evaluateGates(values, calc).map((g) => g.id);
    expect(ids).toContain('G-S1-SUB-LTV-LTE-CAC');
    // The 1–2 warning must not double-fire below 1 for subscriber shapes.
    expect(ids).not.toContain('G-S1-LTVCAC-LT2');
  });

  it('requires the LTV build before economics unlock', () => {
    const values = subscriberBrief();
    values.s1.ltv.contributionPerMonth = null;
    expect(deriveCalcs(values).economicsValid).toBe(false);
  });
});

describe('BOOKING — average ticket with no-shows as returns', () => {
  it('keeps the ROAS frame and the linear engine', () => {
    const values = brief((b) => {
      b.s0.vertical = 'SERVICES_BOOKINGS';
      b.s0.businessModel = 'REPEAT';
      b.s1.ecom.aov = 90; // average ticket
      b.s1.ecom.cogs = 25; // stylist time / materials
      b.s1.ecom.expectedReturnsPct = 10; // no-shows
      b.s1.targets.requiredContributionAfterAds = 15;
    });
    const calc = deriveCalcs(values);
    expect(calc.shape).toBe('BOOKING');
    // 90 − (25 + 9 no-show cost) = 56
    expect(calc.contribution.contribution).toBe(56);
    expect(calc.targets.allowableCac).toBe(41);
    expect(roasFramed(calc.shape)).toBe(true);
  });
});
