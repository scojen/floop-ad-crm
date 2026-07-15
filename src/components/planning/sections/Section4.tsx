import {
  useController,
  useFieldArray,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import type { BriefFormValues } from '../../../lib/schema/campaign-brief';
import type { DerivedCalcs } from '../../../lib/calc/derive';
import {
  AD_SET_PURPOSES,
  OBJECTIVE_TREE,
  OBJECTIVES,
  SUGGESTED_STANDARD_EVENTS,
  type Objective,
} from '../../../lib/schema/sections/s4-structure';
import { FIELD_INFO } from '../../../lib/planning-copy';
import {
  CheckboxField,
  DateField,
  FieldShell,
  NumberField,
  SectionCard,
  SelectField,
  TextAreaField,
  YesNoField,
  inputClass,
} from '../fields';

/** Objectives that make sense for an awareness-intent brief (§1.5). */
const AWARENESS_OBJECTIVES: readonly Objective[] = [
  'AWARENESS',
  'ENGAGEMENT',
  'TRAFFIC',
];

export function Section4({ calc }: { calc: DerivedCalcs | null }) {
  const { control } = useFormContext<BriefFormValues>();
  const objective = useWatch({ control, name: 's4.objective' }) as
    | Objective
    | null;
  const intent = useWatch({ control, name: 's0.campaignIntent' });
  const awareness = intent === 'AWARENESS';
  const objectives = awareness ? AWARENESS_OBJECTIVES : OBJECTIVES;
  const tree = objective ? OBJECTIVE_TREE[objective] : null;
  const learningInfeasible =
    calc?.learning.maxSupportableAdSets !== null &&
    calc?.learning.maxSupportableAdSets !== undefined &&
    calc.learning.maxSupportableAdSets < 1;

  return (
    <SectionCard
      id="s4"
      number="4"
      title="Structure & Feasibility"
      subtitle="Meta will get you exactly what you ask for. §3.2"
      badge={
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
          COMPUTED WARNINGS
        </span>
      }
    >
      <SelectField
        name="s4.objective"
        label="Objective"
        help={
          awareness
            ? 'Awareness intent: conversion objectives are hidden — the platform objective must match the business bet.'
            : undefined
        }
        options={objectives.map((value) => ({
          value,
          label: value.replace('_', ' ').toLowerCase(),
        }))}
      />
      <SelectField
        name="s4.conversionLocation"
        label="Conversion location"
        options={(tree?.locations ?? []).map((value) => ({ value, label: value }))}
        placeholder={tree ? 'Select…' : 'Pick an objective first'}
      />
      <SelectField
        name="s4.performanceGoal"
        label="Performance goal"
        options={(tree?.goals ?? []).map((value) => ({ value, label: value }))}
        placeholder={tree ? 'Select…' : 'Pick an objective first'}
      />

      <OptimizationEventField />
      <TextAreaField
        name="s4.whyThisEvent"
        label="Why this event?"
        minChars={100}
        help="Does this event predict business value, or just satisfy a dashboard? §3.2"
      />
      <NumberField
        name="s4.expectedWeeklyEventVolume"
        label={
          awareness
            ? 'Expected weekly volume of this event (optional for awareness)'
            : 'Expected weekly volume of this event at planned budget'
        }
        info={FIELD_INFO.learningPhase}
      />

      <div className="sm:col-span-2 mt-1 border-t border-neutral-100 pt-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Structure
        </h4>
      </div>
      <SelectField
        name="s4.budgetStrategy"
        label="Budget strategy"
        info={FIELD_INFO.budgetStrategy}
        options={[
          { value: 'CBO', label: 'Campaign budget (CBO)' },
          { value: 'ABO', label: 'Ad set budget (ABO)' },
        ]}
      />
      <NumberField name="s4.campaignDailyBudget" label="Daily budget" prefix="$" />
      <NumberField
        name="s4.targetCpa"
        label={awareness ? 'Target CPA (optional for awareness)' : 'Target CPA'}
        prefix="$"
        info={FIELD_INFO.targetCpa}
        help="Drives the learning-phase feasibility math. §3.3"
      />
      <FeasibilityReadout calc={calc} />
      <AdSetRows />

      {learningInfeasible && (
        <>
          <div className="sm:col-span-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Learning phase is structurally out of reach at this budget/CPA — set
            a decision window and send the uncertainty disclosure. §3.3
          </div>
          <DecisionWindowField />
          <div className="grid grid-cols-2 gap-3">
            <YesNoField
              name="s4.uncertaintyDisclosure.sent"
              label="Uncertainty disclosure sent to client"
            />
            <DateField name="s4.uncertaintyDisclosure.date" label="Sent on" />
          </div>
        </>
      )}

      <div className="sm:col-span-2 mt-1 border-t border-neutral-100 pt-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Attribution & reporting
        </h4>
      </div>
      <SelectField
        name="s4.reportingWindow"
        label="Reporting window"
        options={[
          { value: '7d_click', label: '7d click' },
          { value: '7d_click_1d_view', label: '7d click + 1d view' },
          { value: '28d_click', label: '28d click' },
          { value: 'other', label: 'Other' },
        ]}
      />
      <div className="grid grid-cols-2 gap-3">
        <DateField name="s4.baselinePeriod.from" label="Baseline from" />
        <DateField name="s4.baselinePeriod.to" label="Baseline to" />
      </div>
      <CheckboxField
        name="s4.attributionChangeAcknowledged"
        label="Comparison period does not span an attribution definition change"
      />
    </SectionCard>
  );
}

function DecisionWindowField() {
  const { control } = useFormContext<BriefFormValues>();
  const { field, fieldState } = useController({
    control,
    name: 's4.decisionWindowDays',
  });
  return (
    <FieldShell label="Decision window" error={fieldState.error?.message}>
      <select
        className={inputClass}
        value={field.value === null ? '' : String(field.value)}
        onChange={(event) =>
          field.onChange(
            event.target.value === ''
              ? null
              : (Number(event.target.value) as 7 | 30 | 60 | 90),
          )
        }
      >
        <option value="">Select…</option>
        {[7, 30, 60, 90].map((days) => (
          <option key={days} value={days}>
            {days} days
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

function OptimizationEventField() {
  const { control } = useFormContext<BriefFormValues>();
  const { field, fieldState } = useController({
    control,
    name: 's4.optimizationEvent.name',
  });
  return (
    <div className="sm:col-span-2 rounded-md border-2 border-neutral-800 bg-neutral-50/50 p-3">
      <FieldShell
        label="⭐ OPTIMIZATION EVENT — the most important field on this page"
        error={fieldState.error?.message}
      >
        <input
          list="standard-events"
          className={`${inputClass} text-base font-medium`}
          placeholder="e.g. Purchase"
          value={field.value ?? ''}
          onChange={(event) => field.onChange(event.target.value)}
          onBlur={field.onBlur}
        />
        <datalist id="standard-events">
          {SUGGESTED_STANDARD_EVENTS.map((eventName) => (
            <option key={eventName} value={eventName} />
          ))}
        </datalist>
      </FieldShell>
    </div>
  );
}

function FeasibilityReadout({ calc }: { calc: DerivedCalcs | null }) {
  const learning = calc?.learning;
  return (
    <div className="sm:col-span-2 grid grid-cols-3 gap-2 rounded-md bg-neutral-50 px-3 py-2 text-center">
      {[
        {
          label: 'min budget / ad set',
          value:
            learning?.minDailyBudgetPerAdSet != null
              ? `$${learning.minDailyBudgetPerAdSet}`
              : '—',
        },
        {
          label: 'max supportable ad sets',
          value: learning?.maxSupportableAdSets ?? '—',
        },
        {
          label: 'projected events / week',
          value: learning?.projectedWeeklyEvents ?? '—',
        },
      ].map((cell) => (
        <div key={cell.label}>
          <div className="text-sm font-semibold tabular-nums text-neutral-800">
            {cell.value}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-neutral-400">
            {cell.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function AdSetRows() {
  const { control, register } = useFormContext<BriefFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 's4.adSets' });
  return (
    <div className="sm:col-span-2">
      <span className="mb-1 block text-xs font-medium text-neutral-600">
        Ad sets
      </span>
      <div className="space-y-1.5">
        {fields.map((row, index) => (
          <div key={row.id} className="flex flex-wrap gap-1.5 sm:flex-nowrap">
            <select
              className={`${inputClass} sm:w-40`}
              {...register(`s4.adSets.${index}.purpose`, {
                setValueAs: (value) => (value === '' ? null : value),
              })}
            >
              <option value="">Purpose…</option>
              {AD_SET_PURPOSES.map((purpose) => (
                <option key={purpose} value={purpose}>
                  {purpose.replace('_', ' ').toLowerCase()}
                </option>
              ))}
            </select>
            <AdSetBudget index={index} />
            <input
              placeholder="Audience summary"
              className={`${inputClass} flex-1`}
              {...register(`s4.adSets.${index}.audienceSummary`)}
            />
            <button
              type="button"
              onClick={() => remove(index)}
              className="rounded-md border border-neutral-200 px-2 text-neutral-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          append({
            id: crypto.randomUUID(),
            purpose: null,
            dailyBudget: null,
            audienceSummary: '',
          })
        }
        className="mt-1.5 text-xs text-neutral-500 underline hover:text-neutral-700"
      >
        + add ad set
      </button>
    </div>
  );
}

function AdSetBudget({ index }: { index: number }) {
  const { control } = useFormContext<BriefFormValues>();
  const { field } = useController({
    control,
    name: `s4.adSets.${index}.dailyBudget`,
  });
  return (
    <input
      type="number"
      inputMode="decimal"
      step="any"
      placeholder="$ / day"
      className={`${inputClass} sm:w-28`}
      value={field.value ?? ''}
      onChange={(event) =>
        field.onChange(event.target.value === '' ? null : Number(event.target.value))
      }
    />
  );
}
