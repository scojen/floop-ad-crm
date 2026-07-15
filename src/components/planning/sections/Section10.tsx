import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { BriefFormValues } from '../../../lib/schema/campaign-brief';
import {
  EXPERIMENT_DESIGNS,
  STOPPING_RULES,
} from '../../../lib/schema/sections/s10-experiment';
import {
  computeExperimentPlan,
  mdeSensitivity,
} from '../../../lib/calc/power';
import { FIELD_INFO } from '../../../lib/planning-copy';
import {
  CheckboxField,
  NumberField,
  SectionCard,
  SelectField,
  TextAreaField,
  TextField,
} from '../fields';

const DESIGN_LABELS: Record<(typeof EXPERIMENT_DESIGNS)[number], string> = {
  META_AB_TEST: 'Meta A/B Test (randomized)',
  GEO_HOLDOUT: 'Geo holdout',
  CONVERSION_LIFT: 'Conversion Lift study',
  OBSERVATIONAL: 'Observational (duplicated ad sets) — not a test',
};

const STOPPING_LABELS: Record<(typeof STOPPING_RULES)[number], string> = {
  FIXED_HORIZON: 'Fixed horizon — one look at the end',
  SEQUENTIAL: 'Sequential — pre-specified interim looks',
};

export function Section10() {
  const { control } = useFormContext<BriefFormValues>();
  const stoppingRule = useWatch({ control, name: 's10.stoppingRule' });
  const purpose = useWatch({ control, name: 's2.purpose' });
  const intent = useWatch({ control, name: 's0.campaignIntent' });
  // Mirrors experimentRequired() in campaign-brief.ts, watched so the badge is live.
  const required = purpose === 'LEARNING' || intent === 'AWARENESS';

  return (
    <SectionCard
      id="s10"
      number="10"
      title="Experiment Plan"
      subtitle="An experiment is a design with a pre-committed decision — not two rows in a dashboard. §7"
      badge={
        required ? (
          <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
            REQUIRED
          </span>
        ) : (
          <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
            OPTIONAL — EARNING
          </span>
        )
      }
    >
      <TextAreaField
        name="s10.estimand"
        label="Estimand — what exactly are we measuring?"
        rows={2}
        placeholder="For [who], does [treatment vs control] change [outcome] over [window]?"
        info={FIELD_INFO.estimand}
      />
      <SelectField
        name="s10.design"
        label="Design"
        options={EXPERIMENT_DESIGNS.map((value) => ({
          value,
          label: DESIGN_LABELS[value],
        }))}
      />
      <TextField
        name="s10.randomizationUnit"
        label="Randomization unit"
        placeholder="person / geo / time period"
      />
      <TextField
        name="s10.contaminationControls"
        label="Contamination controls"
        placeholder="e.g. audience exclusions between arms"
      />

      <PowerDesigner />

      <SelectField
        name="s10.stoppingRule"
        label="Stopping rule"
        help="Peeking at daily results and stopping on significance manufactures false winners. §7.6"
        options={STOPPING_RULES.map((value) => ({
          value,
          label: STOPPING_LABELS[value],
        }))}
      />
      {stoppingRule === 'SEQUENTIAL' && (
        <TextField
          name="s10.sequentialMethod"
          label="Sequential method"
          placeholder="e.g. O'Brien-Fleming bounds"
        />
      )}
      <TextAreaField
        name="s10.decisionRule"
        label="Decision rule — pre-committed"
        rows={2}
        placeholder='e.g. "If variant CPA ≤ 90% of control at horizon, roll out; otherwise kill."'
      />
      <TextField
        name="s10.multipleComparisonPlan"
        label="Multiple-comparison plan"
        placeholder="How many things is this test actually testing?"
      />
      <CheckboxField
        name="s10.noPeekingAttestation"
        label="We will not act on interim results outside the stopping rule (no-peeking attestation)"
      />
    </SectionCard>
  );
}

/** Live §7.3 power block: n per arm, cost, days — and the MDE sensitivity table. */
function PowerDesigner() {
  const { control } = useFormContext<BriefFormValues>();
  const power = useWatch({ control, name: 's10.power' });
  const dailyTestBudget = useWatch({ control, name: 's10.dailyTestBudget' });
  const targetCpa = useWatch({ control, name: 's4.targetCpa' });

  const input = useMemo(
    () => ({
      baselineRatePct: power?.baselineRatePct ?? null,
      mdeRelativePct: power?.mdeRelativePct ?? null,
      alphaPct: power?.alphaPct ?? null,
      powerPct: power?.powerPct ?? null,
      allocationPctA: power?.allocationPctA ?? null,
      targetCpa: targetCpa ?? null,
      dailyTestBudget: dailyTestBudget ?? null,
    }),
    [power, targetCpa, dailyTestBudget],
  );
  const plan = useMemo(() => computeExperimentPlan(input), [input]);
  const sensitivity = useMemo(() => mdeSensitivity(input), [input]);

  return (
    <div className="sm:col-span-2 rounded-md border border-dashed border-neutral-300 bg-neutral-50/60 p-3">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Power &amp; feasibility — §7.3
      </h4>
      <div className="grid gap-3 sm:grid-cols-5">
        <NumberField
          name="s10.power.baselineRatePct"
          label="Baseline rate"
          suffix="%"
          info={FIELD_INFO.baselineRate}
        />
        <NumberField
          name="s10.power.mdeRelativePct"
          label="MDE (relative)"
          suffix="%"
          info={FIELD_INFO.mde}
        />
        <NumberField name="s10.power.alphaPct" label="α" suffix="%" />
        <NumberField name="s10.power.powerPct" label="Power" suffix="%" />
        <NumberField name="s10.dailyTestBudget" label="Daily test budget" prefix="$" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-md bg-white px-3 py-2 text-center sm:grid-cols-5">
        {[
          { label: 'n per arm', value: num(plan?.nPerArm) },
          { label: 'n total', value: num(plan?.nTotal) },
          { label: 'conversions / arm', value: num(plan?.conversionsPerArmA) },
          { label: 'est. cost', value: plan?.estCostTotal != null ? `$${plan.estCostTotal.toLocaleString('en-US')}` : '—' },
          {
            label: 'days to complete',
            value: num(plan?.estDaysToComplete),
            alarm: plan?.estDaysToComplete != null && plan.estDaysToComplete > 45,
          },
        ].map((cell) => (
          <div key={cell.label}>
            <div
              className={`text-sm font-semibold tabular-nums ${
                cell.alarm ? 'text-red-600' : 'text-neutral-800'
              }`}
            >
              {cell.value}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-neutral-400">
              {cell.label}
            </div>
          </div>
        ))}
      </div>

      {sensitivity.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-[11px] text-neutral-500">
            Sensitivity — the smaller the effect you insist on detecting, the
            longer you pay for the answer. Test big things.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-neutral-400">
                  <th className="py-1 pr-3 font-medium">MDE</th>
                  <th className="py-1 pr-3 font-medium">n / arm</th>
                  <th className="py-1 pr-3 font-medium">est. cost</th>
                  <th className="py-1 font-medium">days</th>
                </tr>
              </thead>
              <tbody>
                {sensitivity.map((row) => (
                  <tr key={row.mdePct} className="border-t border-neutral-100 text-neutral-700">
                    <td className="py-1 pr-3">{row.mdePct}%</td>
                    <td className="py-1 pr-3">{num(row.nPerArm)}</td>
                    <td className="py-1 pr-3">
                      {row.estCost != null ? `$${row.estCost.toLocaleString('en-US')}` : '—'}
                    </td>
                    <td className={`py-1 ${row.estDays != null && row.estDays > 45 ? 'font-semibold text-red-600' : ''}`}>
                      {num(row.estDays)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const num = (value: number | null | undefined) =>
  value != null ? value.toLocaleString('en-US') : '—';
