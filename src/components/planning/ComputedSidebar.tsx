/**
 * The persistent computed sidebar — the most important UI element in the
 * form (spec). Subscribes to the WHOLE form (confined to this subtree),
 * defers, derives, and renders numbers + gates. Publishes the latest
 * derivation to a ref for autosave/submit, and lifts `economicsValid`
 * so the page can lock/unlock sections without re-rendering per keystroke.
 */
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { deriveCalcs, type DerivedCalcs } from '../../lib/calc/derive';
import { evaluateGates } from '../../lib/gates/evaluate';
import type { GateResult } from '../../lib/gates/types';
import {
  briefFormSchema,
  type BriefFormValues,
} from '../../lib/schema/campaign-brief';
import { GateRow } from './GateRow';

export interface Derivation {
  calc: DerivedCalcs;
  gates: GateResult[];
}

export function ComputedSidebar({
  derivationRef,
  onDerived,
  readOnly,
}: {
  derivationRef: React.MutableRefObject<Derivation | null>;
  onDerived: (derivation: Derivation) => void;
  readOnly?: boolean;
}) {
  const { control } = useFormContext<BriefFormValues>();
  const watched = useWatch({ control });
  const deferred = useDeferredValue(watched);

  const derivation = useMemo<Derivation>(() => {
    // useWatch returns a DeepPartial view; normalize through the schema so
    // the calc engine always sees a complete shape.
    const parsed = briefFormSchema.safeParse(deferred);
    const values = parsed.success
      ? parsed.data
      : (deferred as unknown as BriefFormValues);
    const calc = deriveCalcs(values);
    return { calc, gates: evaluateGates(values, calc) };
  }, [deferred]);

  useEffect(() => {
    derivationRef.current = derivation;
    onDerived(derivation);
  }, [derivation, derivationRef, onDerived]);

  const [mobileOpen, setMobileOpen] = useState(false);
  const blocking = derivation.gates.filter((g) => g.level === 'BLOCKING');
  const warnings = derivation.gates.filter((g) => g.level === 'WARNING');

  const panel = <SidebarPanel derivation={derivation} readOnly={readOnly} />;

  return (
    <>
      {/* Desktop: sticky column */}
      <div className="hidden lg:block">
        <div className="sticky top-4 max-h-[calc(100vh-2rem)] self-start overflow-y-auto rounded-lg border border-neutral-200 bg-white">
          {panel}
        </div>
      </div>

      {/* Mobile: bottom bar + sheet */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-neutral-200 bg-white px-4 py-2.5 text-sm shadow-[0_-2px_8px_rgba(0,0,0,0.06)]"
        >
          <span className="flex items-center gap-3">
            <span className="font-medium text-red-600">🔴 {blocking.length}</span>
            <span className="font-medium text-amber-600">🟡 {warnings.length}</span>
          </span>
          <span className="tabular-nums text-neutral-600">
            target ROAS{' '}
            {derivation.calc.targets.targetRoas !== null
              ? `${derivation.calc.targets.targetRoas}x`
              : '—'}
          </span>
          <span className="text-neutral-400">▲</span>
        </button>
        {mobileOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end bg-black/30"
            onClick={() => setMobileOpen(false)}
          >
            <div
              className="max-h-[75vh] w-full overflow-y-auto rounded-t-xl bg-white"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="sticky top-0 flex justify-between border-b border-neutral-100 bg-white px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Computed
                </span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="text-neutral-400"
                >
                  ✕
                </button>
              </div>
              {panel}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function SidebarPanel({
  derivation,
  readOnly,
}: {
  derivation: Derivation;
  readOnly?: boolean;
}) {
  const { calc, gates } = derivation;
  return (
    <div className="divide-y divide-neutral-100 text-sm">
      <SidebarGroup title="Economics">
        <Row label="Net revenue" value={money(calc.contribution.netRevenue)} />
        <Row
          label="Contribution before ads"
          value={
            calc.contribution.contribution !== null
              ? `${money(calc.contribution.contribution)} (${calc.contribution.contributionPctOfGross}%)`
              : '—'
          }
        />
        {calc.build === 'leadGen' && (
          <Row label="EV per raw lead" value={money(calc.evPerRawLead)} />
        )}
        <Row
          label={calc.build === 'leadGen' ? 'Allowable CPL' : 'Allowable CAC'}
          value={money(calc.targets.allowableCac)}
          strong
        />
        <Row label="Break-even ROAS" value={x(calc.targets.breakEvenRoas)} strong />
        <Row label="Target ROAS" value={x(calc.targets.targetRoas)} strong />
        <Row label="LTV : CAC" value={ratio(calc.ltv.ltvToCac)} />
        <Row
          label="Payback"
          value={
            calc.ltv.paybackMonthsFractional !== null
              ? `${calc.ltv.paybackMonthsFractional} months`
              : '—'
          }
        />
        <Row
          label="Peak cash outstanding"
          value={money(calc.ltv.peakCashOutstanding)}
        />
      </SidebarGroup>

      <SidebarGroup title="Feasibility">
        <Row
          label="Min budget / ad set"
          value={money(calc.learning.minDailyBudgetPerAdSet)}
        />
        <Row
          label="Max supportable ad sets"
          value={calc.learning.maxSupportableAdSets ?? '—'}
        />
        <Row
          label="Projected events / week"
          value={calc.learning.projectedWeeklyEvents ?? '—'}
        />
        <Row label="Receipt ratio" value={calc.receiptRatio ?? '—'} />
      </SidebarGroup>

      <SidebarGroup
        title={`Gates — 🔴 ${gates.filter((g) => g.level === 'BLOCKING').length} · 🟡 ${gates.filter((g) => g.level === 'WARNING').length} · 🔵 ${gates.filter((g) => g.level === 'INFO').length}`}
      >
        {gates.length === 0 && (
          <p className="px-1 py-2 text-xs text-neutral-400">
            No gates triggered. The form has no objection — yet.
          </p>
        )}
        <div className="space-y-2">
          {gates.map((gate) => (
            <GateRow key={gate.id} gate={gate} readOnly={readOnly} />
          ))}
        </div>
      </SidebarGroup>
    </div>
  );
}

function SidebarGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-3 py-3">
      <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
        {title}
      </h4>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string | number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5">
      <span className="text-xs text-neutral-500">{label}</span>
      <span
        className={`tabular-nums ${strong ? 'font-semibold text-neutral-900' : 'text-neutral-700'}`}
      >
        {value}
      </span>
    </div>
  );
}

const money = (v: number | null) => (v !== null ? `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '—');
const x = (v: number | null) => (v !== null ? `${v}x` : '—');
const ratio = (v: number | null) => (v !== null ? `${v}:1` : '—');
