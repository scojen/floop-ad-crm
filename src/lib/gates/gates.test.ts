import { describe, expect, it } from 'vitest';
import { deriveCalcs } from '../calc/derive';
import {
  briefSubmitSchema,
  emptyBrief,
  migratePayload,
  type BriefFormValues,
} from '../schema/campaign-brief';
import { canSubmit, evaluateGates, pruneStale } from './evaluate';

/** A brief with healthy VELLUM-like economics that should trigger no S1 gate. */
function healthyBrief(): BriefFormValues {
  const brief = emptyBrief();
  brief.s0.vertical = 'DTC_ECOM';
  brief.s0.businessModel = 'ONE_TIME';
  brief.s0.backendDataAccess = 'full';
  brief.s1.ecom.aov = 72;
  brief.s1.ecom.promo = { mode: 'currency', value: 0 };
  brief.s1.ecom.cogs = 25;
  brief.s1.ecom.fulfillment = 8;
  brief.s1.ecom.expectedReturnsPct = 5;
  brief.s1.targets.requiredContributionAfterAds = 5;
  return brief;
}

/** KETTLE-like: $145 gross, ~$13 contribution → break-even >6x. */
function kettleBrief(): BriefFormValues {
  const brief = healthyBrief();
  brief.s1.ecom.aov = 145;
  brief.s1.ecom.cogs = 105;
  brief.s1.ecom.fulfillment = 20;
  brief.s1.ecom.expectedReturnsPct = 5; // contribution ≈ 145−105−20−7.25 = 12.75
  brief.s1.targets.requiredContributionAfterAds = 8;
  return brief;
}

describe('gate engine', () => {
  it('a healthy DTC brief triggers no economics gates', () => {
    const brief = healthyBrief();
    const results = evaluateGates(brief, deriveCalcs(brief));
    const ids = results.map((gate) => gate.id);
    expect(ids).not.toContain('G-S1-BE-ROAS-GT6');
    expect(ids).not.toContain('G-S1-TARGET-LTE-BREAKEVEN');
    expect(ids).not.toContain('G-S0-BACKEND-NONE');
  });

  it('KETTLE economics fire the >6x break-even block with numeric copy', () => {
    const brief = kettleBrief();
    const results = evaluateGates(brief, deriveCalcs(brief));
    const gate = results.find((g) => g.id === 'G-S1-BE-ROAS-GT6');
    expect(gate).toBeDefined();
    expect(gate!.level).toBe('BLOCKING');
    expect(gate!.message).toMatch(/Break-even ROAS is 11\.\d+x/);
    expect(gate!.playbookRef).toContain('§2');
  });

  it('impossible targets (required > contribution) block', () => {
    const brief = healthyBrief();
    brief.s1.targets.requiredContributionAfterAds = 50; // > contribution
    const results = evaluateGates(brief, deriveCalcs(brief));
    expect(results.map((g) => g.id)).toContain('G-S1-TARGET-LTE-BREAKEVEN');
  });

  it('backend access "none" blocks; the privacy gate is never overridable', () => {
    const brief = healthyBrief();
    brief.s0.backendDataAccess = 'none';
    brief.s3.privacy.dpaExecuted = false;
    const results = evaluateGates(brief, deriveCalcs(brief));
    expect(results.find((g) => g.id === 'G-S0-BACKEND-NONE')).toBeDefined();
    const privacy = results.find((g) => g.id === 'G-S3-PRIVACY');
    expect(privacy).toBeDefined();
    expect(privacy!.overridable).toBe(false);
  });

  it('CBO + prospecting + retargeting in one campaign blocks (§4.3)', () => {
    const brief = healthyBrief();
    brief.s4.budgetStrategy = 'CBO';
    brief.s4.adSets = [
      { id: 'a', purpose: 'PROSPECTING', dailyBudget: 100, audienceSummary: '' },
      { id: 'b', purpose: 'RETARGETING', dailyBudget: 50, audienceSummary: '' },
    ];
    const results = evaluateGates(brief, deriveCalcs(brief));
    expect(results.map((g) => g.id)).toContain('G-S4-CBO-MIXED-FUNNEL');
  });

  it('too many ad sets for the budget blocks with the supports/declared numbers', () => {
    const brief = healthyBrief();
    brief.s4.campaignDailyBudget = 200;
    brief.s4.targetCpa = 40; // max supportable = 0.7
    brief.s4.adSets = [
      { id: 'a', purpose: 'PROSPECTING', dailyBudget: 100, audienceSummary: '' },
      { id: 'b', purpose: 'PROSPECTING', dailyBudget: 100, audienceSummary: '' },
    ];
    const results = evaluateGates(brief, deriveCalcs(brief));
    const gate = results.find((g) => g.id === 'G-S4-ADSETS-EXCEED');
    expect(gate).toBeDefined();
    expect(gate!.message).toContain('0.7');
    expect(gate!.message).toContain('2');
    // And the structural learning warning demands its companion fields.
    const infeasible = results.find((g) => g.id === 'G-S4-LEARNING-INFEASIBLE');
    expect(infeasible).toBeDefined();
    expect(infeasible!.fieldsSatisfied).toBe(false);
  });

  it('EMQ blocks below 5, warns 5–7, silent at 7+', () => {
    const brief = healthyBrief();
    brief.s3.emqScore = 4;
    let ids = evaluateGates(brief, deriveCalcs(brief)).map((g) => g.id);
    expect(ids).toContain('G-S3-EMQ');

    brief.s3.emqScore = 6;
    ids = evaluateGates(brief, deriveCalcs(brief)).map((g) => g.id);
    expect(ids).not.toContain('G-S3-EMQ');
    expect(ids).toContain('G-S3-EMQ-WARN');

    brief.s3.emqScore = 8;
    ids = evaluateGates(brief, deriveCalcs(brief)).map((g) => g.id);
    expect(ids).not.toContain('G-S3-EMQ');
    expect(ids).not.toContain('G-S3-EMQ-WARN');
  });

  it('receipt ratio outside 0.70–1.15 blocks', () => {
    const brief = healthyBrief();
    brief.s3.reconciliation.backendOrders7d = 100;
    brief.s3.reconciliation.eventsManagerReceived7d = 130;
    const results = evaluateGates(brief, deriveCalcs(brief));
    expect(results.map((g) => g.id)).toContain('G-S3-RECEIPT-RATIO');
  });
});

describe('canSubmit', () => {
  it('blocking gates need a ≥30-char override; warnings need acknowledgment', () => {
    const brief = kettleBrief();
    const results = evaluateGates(brief, deriveCalcs(brief));

    const bare = canSubmit(results, {}, {});
    expect(bare.ok).toBe(false);

    const overrides: BriefFormValues['overrides'] = {};
    const acks: BriefFormValues['acknowledgments'] = {};
    for (const gate of results) {
      if (gate.level === 'BLOCKING') {
        overrides[gate.id] = {
          justification: 'short',
          actorId: 'rep-1',
          at: new Date().toISOString(),
        };
      } else if (gate.level === 'WARNING') {
        acks[gate.id] = { at: new Date().toISOString(), actorId: 'rep-1' };
      }
    }
    expect(canSubmit(results, acks, overrides).ok).toBe(false); // too short

    for (const id of Object.keys(overrides)) {
      overrides[id].justification =
        'Client explicitly accepts the economics risk for a strategic launch window.';
    }
    expect(canSubmit(results, acks, overrides).ok).toBe(true);
  });

  it('a non-overridable gate can never be satisfied by an override', () => {
    const brief = healthyBrief();
    brief.s3.privacy.dpaExecuted = false;
    const results = evaluateGates(brief, deriveCalcs(brief));
    const overrides: BriefFormValues['overrides'] = {
      'G-S3-PRIVACY': {
        justification:
          'We will definitely get the DPA signed at some point soon, promise.',
        actorId: 'rep-1',
        at: new Date().toISOString(),
      },
    };
    const check = canSubmit(results, {}, overrides);
    expect(check.ok).toBe(false);
    expect(
      check.unresolved.some((entry) => entry.gate.id === 'G-S3-PRIVACY'),
    ).toBe(true);
  });

  it('pruneStale drops acks/overrides for gates that no longer fire', () => {
    const brief = healthyBrief();
    const results = evaluateGates(brief, deriveCalcs(brief));
    const pruned = pruneStale(
      results,
      { 'G-S1-BE-ROAS-GT6': { at: 'x', actorId: 'r' } },
      {},
    );
    expect(pruned.acknowledgments['G-S1-BE-ROAS-GT6']).toBeUndefined();
  });
});

describe('schema round-trips', () => {
  it('an empty brief parses under the base schema (drafts always save)', () => {
    expect(() => emptyBrief()).not.toThrow();
    expect(migratePayload({})).toMatchObject({ schemaVersion: 1 });
    expect(migratePayload(null).s0.vertical).toBeNull();
  });

  it('migratePayload backfills unknown payloads onto the empty brief', () => {
    const migrated = migratePayload({ s0: { clientName: 'Vellum' } });
    expect(migrated.s0.clientName).toBe('Vellum');
    expect(migrated.s1.ecom.aov).toBeNull();
  });

  it('submit schema rejects an incomplete brief with per-path issues', () => {
    const result = briefSubmitSchema.safeParse(emptyBrief());
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join('.'));
      expect(paths).toContain('s0.clientName');
      expect(paths).toContain('s2.changeOurMind.text');
      expect(paths).toContain('s4.whyThisEvent');
    }
  });
});
