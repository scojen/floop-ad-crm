import {
  useCpqlReport,
  useCreativeReport,
  useFunnelReport,
} from '../api/queries';
import type { FunnelRow } from '../types/v15';

/**
 * Funnel stage colors: validated ordinal ramp (single blue hue,
 * light→dark = raw→won). See dataviz palette — do not reorder or add hues.
 */
const FUNNEL_STEPS = [
  { key: 'leads', label: 'Leads', color: '#86b6ef' },
  { key: 'accepted', label: 'Accepted', color: '#5598e7' },
  { key: 'qualified', label: 'Qualified', color: '#2a78d6' },
  { key: 'won', label: 'Won', color: '#1c5cab' },
] as const;

export function ReportsPage() {
  return (
    <div>
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">Reports</h2>
        <p className="text-sm text-neutral-500">
          Lead quality economics — last 30 days.
        </p>
      </header>
      <div className="space-y-5">
        <FunnelSection />
        <CpqlSection />
        <CreativeSection />
      </div>
    </div>
  );
}

function FunnelSection() {
  const funnel = useFunnelReport();
  const totals = funnel.data?.totals;
  const max = totals?.leads ?? 0;

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-neutral-900">
        Funnel — leads → accepted → qualified → won
      </h3>

      {totals && max > 0 ? (
        <div className="mt-3 space-y-2" role="img" aria-label="Lead funnel">
          {FUNNEL_STEPS.map((step) => {
            const value = totals[step.key];
            const width = Math.max((value / max) * 100, value > 0 ? 2 : 0);
            return (
              <div key={step.key} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs text-neutral-500">
                  {step.label}
                </span>
                <div className="relative h-5 flex-1">
                  <div
                    title={`${step.label}: ${value}`}
                    className="h-5 rounded-r"
                    style={{
                      width: `${width}%`,
                      backgroundColor: step.color,
                      minWidth: value > 0 ? 4 : 0,
                    }}
                  />
                  <span className="absolute top-0 ml-2 text-xs tabular-nums leading-5 text-neutral-700"
                    style={{ left: `${width}%` }}
                  >
                    {value.toLocaleString()}
                    {step.key !== 'leads' && max > 0 && (
                      <span className="text-neutral-400">
                        {' '}
                        · {Math.round((value / max) * 100)}%
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-sm text-neutral-400">
          {funnel.isLoading ? 'Loading…' : 'No leads in the window yet.'}
        </p>
      )}

      {funnel.data && funnel.data.rows.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                <th className="py-2 pr-4 font-medium">Campaign</th>
                <th className="py-2 pr-4 text-right font-medium">Leads</th>
                <th className="py-2 pr-4 text-right font-medium">Accepted</th>
                <th className="py-2 pr-4 text-right font-medium">Discarded</th>
                <th className="py-2 pr-4 text-right font-medium">Qualified</th>
                <th className="py-2 text-right font-medium">Won</th>
              </tr>
            </thead>
            <tbody>
              {funnel.data.rows.map((row) => (
                <FunnelTableRow key={row.campaignId ?? 'none'} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function FunnelTableRow({ row }: { row: FunnelRow }) {
  return (
    <tr className="border-b border-neutral-100 last:border-b-0">
      <td className="py-2 pr-4 text-neutral-800">
        {row.campaignName ?? row.campaignId ?? 'Unattributed'}
      </td>
      <td className="py-2 pr-4 text-right tabular-nums">{row.leads}</td>
      <td className="py-2 pr-4 text-right tabular-nums">{row.accepted}</td>
      <td className="py-2 pr-4 text-right tabular-nums text-neutral-400">
        {row.discarded}
      </td>
      <td className="py-2 pr-4 text-right tabular-nums">{row.qualified}</td>
      <td className="py-2 text-right tabular-nums">{row.won}</td>
    </tr>
  );
}

function CpqlSection() {
  const cpql = useCpqlReport();
  const data = cpql.data;

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-neutral-900">
        Cost per qualified lead
      </h3>
      <p className="text-xs text-neutral-400">
        Ad spend joined against CRM outcomes — the number CPL hides.
      </p>

      {cpql.isError && (
        <p className="mt-3 text-sm text-amber-700">
          Spend data unavailable: {cpql.error.message}
        </p>
      )}

      {data && (
        <>
          <div className="mt-3 flex gap-6 text-sm">
            <Stat label="Spend" value={money(data.totals.spend)} />
            <Stat label="Leads" value={String(data.totals.leads)} />
            <Stat label="Qualified" value={String(data.totals.qualified)} />
            <Stat
              label="CPL"
              value={data.totals.costPerLead ? money(data.totals.costPerLead) : '—'}
            />
            <Stat
              label="Cost / qualified"
              value={
                data.totals.costPerQualifiedLead
                  ? money(data.totals.costPerQualifiedLead)
                  : '—'
              }
              strong
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="py-2 pr-4 font-medium">Campaign</th>
                  <th className="py-2 pr-4 text-right font-medium">Spend</th>
                  <th className="py-2 pr-4 text-right font-medium">Leads</th>
                  <th className="py-2 pr-4 text-right font-medium">Qualified</th>
                  <th className="py-2 pr-4 text-right font-medium">CPL</th>
                  <th className="py-2 text-right font-medium">Cost/qual.</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr
                    key={row.campaignId ?? 'none'}
                    className="border-b border-neutral-100 last:border-b-0"
                  >
                    <td className="py-2 pr-4 text-neutral-800">
                      {row.campaignName ?? row.campaignId ?? 'Unattributed'}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {money(row.spend)}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {row.leads}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {row.qualified}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {row.costPerLead ? money(row.costPerLead) : '—'}
                    </td>
                    <td className="py-2 text-right font-medium tabular-nums">
                      {row.costPerQualifiedLead
                        ? money(row.costPerQualifiedLead)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function CreativeSection() {
  const creative = useCreativeReport();

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-neutral-900">
        Creative performance
      </h3>
      <p className="text-xs text-neutral-400">
        Which ads produce leads that actually convert — kill or scale on
        downstream quality, not CTR.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
              <th className="py-2 pr-4 font-medium">Ad</th>
              <th className="py-2 pr-4 font-medium">Campaign</th>
              <th className="py-2 pr-4 text-right font-medium">Leads</th>
              <th className="py-2 pr-4 text-right font-medium">Accepted</th>
              <th className="py-2 pr-4 text-right font-medium">Qualified</th>
              <th className="py-2 text-right font-medium">Qual. rate</th>
            </tr>
          </thead>
          <tbody>
            {creative.data?.rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-neutral-400">
                  No creative data in the window yet.
                </td>
              </tr>
            )}
            {creative.data?.rows.map((row) => (
              <tr
                key={row.adId ?? 'none'}
                className="border-b border-neutral-100 last:border-b-0"
              >
                <td className="py-2 pr-4 text-neutral-800">
                  {row.adName ?? row.adId ?? 'Unattributed'}
                </td>
                <td className="py-2 pr-4 text-neutral-500">
                  {row.campaignName ?? '—'}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {row.leads}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {row.accepted}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {row.qualified}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {row.qualifiedRate != null
                    ? `${Math.round(row.qualifiedRate * 100)}%`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <div
        className={`tabular-nums ${strong ? 'text-lg font-bold text-neutral-900' : 'text-lg font-semibold text-neutral-800'}`}
      >
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-neutral-400">
        {label}
      </div>
    </div>
  );
}

function money(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 100 ? 0 : 2,
  });
}
