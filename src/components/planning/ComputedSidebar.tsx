/**
 * The persistent computed sidebar — the most important UI element in the
 * form (spec). Subscribes to the WHOLE form (confined to this subtree),
 * defers, derives, and renders numbers + gates. Publishes the latest
 * derivation to a ref for autosave/submit, and lifts `economicsValid`
 * so the page can lock/unlock sections without re-rendering per keystroke.
 */
import { useEffect, useState } from 'react';
import { METRIC_SENTENCES, SHAPE_UI } from '../../lib/planning-copy';
import { GateRow } from './GateRow';
import { useLiveDerivation, type Derivation } from './useLiveDerivation';

export type { Derivation } from './useLiveDerivation';

export function ComputedSidebar({
  derivationRef,
  onDerived,
  readOnly,
}: {
  derivationRef: React.MutableRefObject<Derivation | null>;
  onDerived: (derivation: Derivation) => void;
  readOnly?: boolean;
}) {
  const derivation = useLiveDerivation();

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

  if (calc.intent === 'AWARENESS') {
    return (
      <div className="divide-y divide-neutral-100 text-sm">
        <SidebarGroup title="Investment (awareness track)">
          <p className="mb-1.5 text-[10px] leading-snug text-neutral-400">
            No ROAS math on this track — the scoreboard is the lift plan in
            Section 10 and the §1.5 guardrail.
          </p>
        </SidebarGroup>
        <ExperimentGroup calc={calc} />
        <GatesGroup gates={gates} readOnly={readOnly} />
      </div>
    );
  }

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
          sentence={METRIC_SENTENCES.contribution(calc)}
        />
        {calc.build === 'leadGen' && (
          <Row
            label={SHAPE_UI[calc.shape].evLabel ?? 'EV per raw lead'}
            value={money(calc.evPerRawLead)}
            sentence={METRIC_SENTENCES.evPerRawLead(calc)}
          />
        )}
        <Row
          label={SHAPE_UI[calc.shape].allowableLabel}
          value={money(calc.targets.allowableCac)}
          strong
          sentence={METRIC_SENTENCES.allowableCac(calc)}
        />
        <Row
          label="Break-even ROAS"
          value={x(calc.targets.breakEvenRoas)}
          strong
          sentence={METRIC_SENTENCES.breakEvenRoas(calc)}
        />
        <Row
          label="Target ROAS"
          value={x(calc.targets.targetRoas)}
          strong
          sentence={METRIC_SENTENCES.targetRoas(calc)}
        />
        <Row
          label="LTV : CAC"
          value={ratio(calc.ltv.ltvToCac)}
          sentence={METRIC_SENTENCES.ltvToCac(calc)}
        />
        <Row
          label="Payback"
          value={
            calc.ltv.paybackMonthsFractional !== null
              ? `${calc.ltv.paybackMonthsFractional} months`
              : '—'
          }
          sentence={METRIC_SENTENCES.payback(calc)}
        />
        <Row
          label="Peak cash outstanding"
          value={money(calc.ltv.peakCashOutstanding)}
          sentence={METRIC_SENTENCES.peakCash(calc)}
        />
        {calc.offer && (
          <Row
            label="With offer → break-even"
            value={x(calc.offer.targets.breakEvenRoas)}
            strong
            sentence="The Section 6 offer applied to the same economics — the number the §1 gates judge while the promotion runs."
          />
        )}
      </SidebarGroup>

      <SidebarGroup title="Feasibility">
        <Row
          label="Min budget / ad set"
          value={money(calc.learning.minDailyBudgetPerAdSet)}
          sentence={METRIC_SENTENCES.minBudget(calc)}
        />
        <Row
          label="Max supportable ad sets"
          value={calc.learning.maxSupportableAdSets ?? '—'}
        />
        <Row
          label="Projected events / week"
          value={calc.learning.projectedWeeklyEvents ?? '—'}
        />
        <Row
          label="Receipt ratio"
          value={calc.receiptRatio ?? '—'}
          sentence={METRIC_SENTENCES.receiptRatio(calc)}
        />
      </SidebarGroup>

      <ExperimentGroup calc={calc} />
      <GatesGroup gates={gates} readOnly={readOnly} />
    </div>
  );
}

function ExperimentGroup({ calc }: { calc: Derivation['calc'] }) {
  if (!calc.experimentRequired && !calc.experiment) return null;
  return (
    <SidebarGroup
      title={`Experiment${calc.experimentRequired ? ' — required' : ''}`}
    >
      <Row label="n per arm" value={calc.experiment?.nPerArm ?? '—'} />
      <Row
        label="Est. cost"
        value={money(calc.experiment?.estCostTotal ?? null)}
      />
      <Row
        label="Days to complete"
        value={calc.experiment?.estDaysToComplete ?? '—'}
        strong
        sentence={
          calc.experiment?.estDaysToComplete != null &&
          calc.experiment.estDaysToComplete > 45
            ? 'Over 45 days — raise the MDE (test something bigger) or accept this is not a test. §7.3'
            : null
        }
      />
    </SidebarGroup>
  );
}

function GatesGroup({
  gates,
  readOnly,
}: {
  gates: Derivation['gates'];
  readOnly?: boolean;
}) {
  return (
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
  sentence,
}: {
  label: string;
  value: string | number;
  strong?: boolean;
  /** Plain-English translation, professional term included — teaches while it works. */
  sentence?: string | null;
}) {
  return (
    <div className="py-0.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-neutral-500">{label}</span>
        <span
          className={`tabular-nums ${strong ? 'font-semibold text-neutral-900' : 'text-neutral-700'}`}
        >
          {value}
        </span>
      </div>
      {sentence && (
        <p className="mt-0.5 text-[10px] leading-snug text-neutral-400">
          {sentence}
        </p>
      )}
    </div>
  );
}

const money = (v: number | null) => (v !== null ? `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '—');
const x = (v: number | null) => (v !== null ? `${v}x` : '—');
const ratio = (v: number | null) => (v !== null ? `${v}:1` : '—');
