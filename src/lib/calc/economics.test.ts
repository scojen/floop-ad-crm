import { describe, expect, it } from 'vitest';
import {
  applyWhatIf,
  computeAllowableCpl,
  computeCashRequirement,
  computeEcomContribution,
  computeLeadEv,
  computeLtv,
  computePayback,
  computeTargets,
  type EcomBuildInput,
} from './economics';

const baseBuild: EcomBuildInput = {
  aov: 100,
  takeRatePct: null,
  promo: { mode: 'percent', value: 10 },
  cogs: 30,
  fulfillment: 8,
  paymentPct: 2.9,
  paymentFixed: 0.3,
  expectedReturnsPct: 5,
  returnsCostOverride: null,
  variableCsPackaging: 1,
  extraCosts: [{ id: 'x1', label: 'chargebacks', amount: 1.5 }],
};

describe('computeEcomContribution', () => {
  it('builds contribution line by line (§2.1)', () => {
    const result = computeEcomContribution(baseBuild);
    expect(result.netRevenue).toBe(90);
    expect(result.promoCost).toBe(10);
    expect(result.paymentCost).toBe(2.91); // 90 × 2.9% + 0.30
    expect(result.returnsCost).toBe(4.5); // 5% of net
    expect(result.totalVariableCost).toBe(47.91);
    expect(result.contribution).toBe(42.09);
    expect(result.contributionPctOfGross).toBe(42.09);
  });

  it('lets an explicit returns override win over the % input', () => {
    const result = computeEcomContribution({
      ...baseBuild,
      returnsCostOverride: 2,
    });
    expect(result.returnsCost).toBe(2);
    expect(result.contribution).toBe(44.59);
  });

  it('handles promo as fixed currency', () => {
    const result = computeEcomContribution({
      ...baseBuild,
      promo: { mode: 'currency', value: 5 },
    });
    expect(result.netRevenue).toBe(95);
  });

  it('returns all-null when AOV or COGS is missing', () => {
    expect(computeEcomContribution({ ...baseBuild, aov: null }).contribution)
      .toBeNull();
    expect(computeEcomContribution({ ...baseBuild, cogs: null }).contribution)
      .toBeNull();
  });
});

describe('computeTargets — playbook worked examples', () => {
  it('VELLUM (docx §2.2): net $72, contribution $31, required $5 → CAC $26, target 2.77x', () => {
    const result = computeTargets({
      grossOrderValue: 72,
      netRevenue: 72,
      contributionBeforeAds: 31,
      requiredContributionAfterAds: 5,
    });
    expect(result.allowableCac).toBe(26);
    expect(result.targetRoas).toBe(2.77); // net ÷ CAC — playbook wins over spec
  });

  it('VELLUM (spec fixture): $34.30 contribution on $72 gross → 2.10x break-even', () => {
    const result = computeTargets({
      grossOrderValue: 72,
      netRevenue: 72,
      contributionBeforeAds: 34.3,
      requiredContributionAfterAds: 5,
    });
    expect(result.breakEvenRoas).toBe(2.1);
  });

  it('KETTLE (spec fixture): $13.10 contribution on $145 gross → 11.07x break-even', () => {
    const result = computeTargets({
      grossOrderValue: 145,
      netRevenue: 145,
      contributionBeforeAds: 13.1,
      requiredContributionAfterAds: 8,
    });
    expect(result.breakEvenRoas).toBe(11.07);
  });

  it('KETTLE (docx §2.2): net $145, contribution $31, required $8 → CAC $23, target 6.30x', () => {
    const result = computeTargets({
      grossOrderValue: 145,
      netRevenue: 145,
      contributionBeforeAds: 31,
      requiredContributionAfterAds: 8,
    });
    expect(result.allowableCac).toBe(23);
    expect(result.targetRoas).toBe(6.3);
  });

  it('is null-safe: no target when allowable CAC ≤ 0, no break-even when contribution ≤ 0', () => {
    const impossible = computeTargets({
      grossOrderValue: 100,
      netRevenue: 100,
      contributionBeforeAds: 4,
      requiredContributionAfterAds: 10,
    });
    expect(impossible.allowableCac).toBe(-6);
    expect(impossible.targetRoas).toBeNull();

    const zeroContribution = computeTargets({
      grossOrderValue: 100,
      netRevenue: 100,
      contributionBeforeAds: 0,
      requiredContributionAfterAds: 5,
    });
    expect(zeroContribution.breakEvenRoas).toBeNull();
  });
});

describe('lead-gen economics (§2.5)', () => {
  it('EV per raw lead = funnel product × collected contribution', () => {
    const { evPerRawLead } = computeLeadEv({
      contributionPerClose: 4500,
      pQualGivenLeadPct: 40,
      pApptGivenQualPct: 50,
      pCloseGivenApptPct: 25,
    });
    expect(evPerRawLead).toBe(225);
    expect(computeAllowableCpl(evPerRawLead, 50)).toBe(175);
  });

  it('returns null when any funnel input is missing', () => {
    expect(
      computeLeadEv({
        contributionPerClose: 4500,
        pQualGivenLeadPct: null,
        pApptGivenQualPct: 50,
        pCloseGivenApptPct: 25,
      }).evPerRawLead,
    ).toBeNull();
  });
});

describe('LTV & payback (§2.3, §2.4)', () => {
  it('AXIOM: $15.60/mo at $70 CAC → payback month 5, ~4.5 months fractional', () => {
    const result = computePayback({
      cac: 70,
      contributionPerMonth: 15.6,
      churnMonthly: 0,
    });
    expect(result.paybackMonth).toBe(5);
    expect(result.paybackMonthsFractional).toBe(4.49);
  });

  it('churn pushes payback later; unreachable payback is null', () => {
    const withChurn = computePayback({
      cac: 70,
      contributionPerMonth: 15.6,
      churnMonthly: 0.15,
    });
    expect(withChurn.paybackMonth).toBeGreaterThan(5);
    expect(
      computePayback({ cac: 10_000, contributionPerMonth: 15.6 }).paybackMonth,
    ).toBeNull();
  });

  it('discounted LTV: 10-month retention, no discounting → geometric sum', () => {
    const undiscounted = computeLtv({
      contributionPerMonth: 15.6,
      retention: { mode: 'months', value: 10 },
      discountRateAnnualPct: 0,
    });
    expect(undiscounted.discountedLtv).toBe(137.24);

    const discounted = computeLtv({
      contributionPerMonth: 15.6,
      retention: { mode: 'months', value: 10 },
      discountRateAnnualPct: 12,
    });
    expect(discounted.discountedLtv).not.toBeNull();
    expect(discounted.discountedLtv!).toBeLessThan(
      undiscounted.discountedLtv!,
    );
  });

  it('cash requirement approximates stacked unrecouped cohorts', () => {
    const result = computeCashRequirement({
      plannedMonthlySpend: 10_000,
      cac: 70,
      paybackMonth: 5,
    });
    expect(result.newCustomersPerMonth).toBe(142.86);
    expect(result.peakCashOutstanding).toBe(50_000);
    expect(result.monthsToCohortCashPositive).toBe(5);
  });
});

describe('applyWhatIf — the four levers', () => {
  const kettleish: EcomBuildInput = {
    aov: 145,
    takeRatePct: null,
    promo: { mode: 'currency', value: 0 },
    cogs: 95,
    fulfillment: 25,
    paymentPct: 0,
    paymentFixed: 0,
    expectedReturnsPct: 8,
    returnsCostOverride: null,
    variableCsPackaging: 0,
    extraCosts: [],
  };

  it('price and freight levers move break-even live', () => {
    const before = applyWhatIf(
      kettleish,
      { priceDelta: null, bundle: null, returnRatePctOverride: null, freightDelta: null },
      8,
    );
    const after = applyWhatIf(
      kettleish,
      { priceDelta: 20, bundle: null, returnRatePctOverride: 4, freightDelta: -10 },
      8,
    );
    expect(before.targets.breakEvenRoas).not.toBeNull();
    expect(after.targets.breakEvenRoas).not.toBeNull();
    expect(after.targets.breakEvenRoas!).toBeLessThan(
      before.targets.breakEvenRoas!,
    );
  });

  it('bundle lever multiplies AOV and COGS', () => {
    const bundled = applyWhatIf(
      kettleish,
      {
        priceDelta: null,
        bundle: { aovFactor: 2, cogsFactor: 1.8 },
        returnRatePctOverride: null,
        freightDelta: null,
      },
      8,
    );
    expect(bundled.build.aov).toBe(290);
    expect(bundled.build.cogs).toBe(171);
  });
});
