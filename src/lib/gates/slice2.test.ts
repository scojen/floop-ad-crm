import { describe, expect, it } from 'vitest';
import { applyOfferImpact } from '../calc/economics';
import { computeExperimentPlan, mdeSensitivity } from '../calc/power';
import { deriveCalcs } from '../calc/derive';
import { emptyBrief, type BriefFormValues } from '../schema/campaign-brief';
import { evaluateGates } from './evaluate';
import { lintHook, lintHooks } from './hook-linter';

function drBrief(): BriefFormValues {
  const brief = emptyBrief();
  brief.s0.vertical = 'DTC_ECOM';
  brief.s0.businessModel = 'ONE_TIME';
  brief.s0.campaignIntent = 'DIRECT_RESPONSE';
  brief.s0.backendDataAccess = 'full';
  brief.s1.ecom.aov = 72;
  brief.s1.ecom.promo = { mode: 'currency', value: 0 };
  brief.s1.ecom.cogs = 24;
  brief.s1.ecom.fulfillment = 7;
  brief.s1.targets.requiredContributionAfterAds = 5;
  return brief;
}

describe('offer impact (S6)', () => {
  it('recomputes contribution and break-even with the offer applied', () => {
    const base = drBrief().s1.ecom;
    const result = applyOfferImpact(
      base,
      {
        discount: { mode: 'percent', value: 20 },
        giftCostPerOrder: 3,
        expectedAovImpact: null,
      },
      5,
    );
    expect(result).not.toBeNull();
    // 20% discount: net 57.6; costs 24+7+3 → contribution 23.6 on gross 72
    expect(result!.contribution.contribution).toBe(23.6);
    expect(result!.targets.breakEvenRoas).toBe(3.05);
  });

  it('fires G-S6-OFFER-BREAKS-ECONOMICS when the offer crosses the 6x line', () => {
    const brief = drBrief();
    brief.s1.ecom.cogs = 50; // base contribution 15 → BE 4.8x (under 6)
    brief.s6.offerType = 'PERCENTAGE_DISCOUNT';
    brief.s6.discount = { mode: 'percent', value: 10 }; // net 64.8 → contribution 7.8 → 9.23x
    const gates = evaluateGates(brief, deriveCalcs(brief));
    const gate = gates.find((g) => g.id === 'G-S6-OFFER-BREAKS-ECONOMICS');
    expect(gate).toBeDefined();
    expect(gate!.message).toMatch(/4\.8x to 9\.23x/);
  });
});

describe('experiment planner (S10, §7.3)', () => {
  const input = {
    baselineRatePct: 2,
    mdeRelativePct: 20,
    alphaPct: 5,
    powerPct: 80,
    allocationPctA: 50,
    targetCpa: 40,
    dailyTestBudget: 300,
  };

  it('derives n, conversions, cost, and days', () => {
    const plan = computeExperimentPlan(input);
    expect(plan).not.toBeNull();
    expect(plan!.nPerArm).toBeGreaterThan(20_000); // 2% baseline, small effect
    expect(plan!.conversionsPerArmA).toBe(Math.ceil(plan!.nPerArm * 0.02));
    expect(plan!.estCostTotal).toBeGreaterThan(0);
    expect(plan!.estDaysToComplete).toBe(
      Math.ceil(plan!.estCostTotal! / 300),
    );
  });

  it('sensitivity: bigger MDE → fewer days ("test big things")', () => {
    const rows = mdeSensitivity(input);
    expect(rows.map((r) => r.mdePct)).toEqual([5, 10, 20, 30, 50]);
    expect(rows[0].estDays!).toBeGreaterThan(rows[4].estDays!);
  });

  it('gates: >45 days blocks; observational warns; missing plan blocks when required', () => {
    const brief = drBrief();
    brief.s2.purpose = 'LEARNING';
    brief.s10.power.baselineRatePct = 2;
    brief.s10.power.mdeRelativePct = 5; // tiny effect → enormous sample
    brief.s10.dailyTestBudget = 100;
    brief.s4.targetCpa = 40;
    brief.s10.design = 'OBSERVATIONAL';
    const gates = evaluateGates(brief, deriveCalcs(brief));
    const ids = gates.map((g) => g.id);
    expect(ids).toContain('G-S10-DAYS-GT45');
    expect(ids).toContain('G-S10-OBSERVATIONAL');
    expect(ids).toContain('G-S10-REQUIRED-INCOMPLETE'); // stopping/decision missing
  });
});

describe('awareness intent fork', () => {
  function awarenessBrief(): BriefFormValues {
    const brief = emptyBrief();
    brief.s0.vertical = 'DTC_ECOM';
    brief.s0.businessModel = 'REPEAT';
    brief.s0.campaignIntent = 'AWARENESS';
    brief.s0.backendDataAccess = 'full';
    // Deliberately terrible DR economics that must NOT gate awareness:
    brief.s1.ecom.aov = 145;
    brief.s1.ecom.cogs = 140;
    brief.s1.targets.requiredContributionAfterAds = 8;
    return brief;
  }

  it('silences the economics gates and requires the lift plan instead', () => {
    const brief = awarenessBrief();
    const calc = deriveCalcs(brief);
    const ids = evaluateGates(brief, calc).map((g) => g.id);
    expect(ids).not.toContain('G-S1-BE-ROAS-GT6');
    expect(ids).not.toContain('G-S1-TARGET-LTE-BREAKEVEN');
    expect(ids).toContain('G-S10-REQUIRED-INCOMPLETE');
    expect(calc.experimentRequired).toBe(true);
  });

  it('economicsValid comes from the investment rationale, not contribution', () => {
    const brief = awarenessBrief();
    expect(deriveCalcs(brief).economicsValid).toBe(false);
    brief.s1.awareness.plannedMonthlyBudget = 5000;
    brief.s1.awareness.futureValueHypothesis =
      'Grow branded search volume 20% in 2 quarters to lower blended CAC.';
    expect(deriveCalcs(brief).economicsValid).toBe(true);
  });
});

describe('hook linter (S9 — heuristic aid, not compliance)', () => {
  it('flags second-person + sensitive-attribute combinations', () => {
    expect(lintHook('Are you struggling with debt?')).toContain('debt');
    expect(lintHook('Is your weight holding you back?')).toContain('weight');
  });

  it('does not flag topic-only or first-person phrasing', () => {
    expect(lintHook('Debt consolidation, explained simply')).toEqual([]);
    expect(lintHook('How I fixed my sleep in 30 days')).toEqual([]);
  });

  it('surfaces as a warning gate listing flagged hooks', () => {
    const brief = drBrief();
    brief.s7.hookVariants = [
      { id: 'h1', text: 'Are you drowning in credit card debt?' },
      { id: 'h2', text: 'A calmer way to manage money' },
    ];
    const gates = evaluateGates(brief, deriveCalcs(brief));
    const gate = gates.find((g) => g.id === 'G-S9-HOOK-ATTRIBUTES');
    expect(gate).toBeDefined();
    expect(lintHooks(brief.s7.hookVariants)).toHaveLength(1);
  });
});

describe('intake capacity gates (S11)', () => {
  it('blocks buying leads the team cannot serve', () => {
    const brief = drBrief();
    brief.s0.vertical = 'LEADGEN_LOCAL';
    brief.s1.leadGen = {
      contributionPerClose: 1350,
      pQualGivenLeadPct: 45,
      pApptGivenQualPct: 60,
      pCloseGivenApptPct: 35,
    };
    brief.s11.intake.capacityUtilizationPct = 97;
    brief.s11.intake.p90FirstResponseMinutes = 2000;
    const ids = evaluateGates(brief, deriveCalcs(brief)).map((g) => g.id);
    expect(ids).toContain('G-S11-CAPACITY');
    expect(ids).toContain('G-S11-P90-RESPONSE');
  });
});
