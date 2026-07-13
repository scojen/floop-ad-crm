import { useMemo } from 'react';
import { useCampaignBreakdown, useCampaigns } from '../api/queries';
import type { PerformanceRow } from '../types/campaigns';

/** v0 foothold screen: read-only campaign list joined with 30-day metrics. */
export function CampaignsPage() {
  const { since, until } = useMemo(() => last30Days(), []);
  const campaigns = useCampaigns();
  const breakdown = useCampaignBreakdown(since, until);

  const metricsByCampaign = useMemo(() => {
    const map = new Map<string, PerformanceRow>();
    for (const row of breakdown.data?.rows ?? []) {
      if (row.campaignId) {
        map.set(row.campaignId, row);
      }
    }
    return map;
  }, [breakdown.data]);

  return (
    <div>
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">Campaigns</h2>
        <p className="text-sm text-neutral-500">
          Read-only mirror of Meta campaign state · metrics for {since} →{' '}
          {until}
        </p>
      </header>

      {campaigns.isLoading && <Placeholder text="Loading campaigns…" />}
      {campaigns.isError && (
        <ErrorNote
          text={`Couldn't load campaigns: ${campaigns.error.message}`}
        />
      )}

      {campaigns.data && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-2.5 font-medium">Campaign</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Spend</th>
                <th className="px-4 py-2.5 text-right font-medium">Impr.</th>
                <th className="px-4 py-2.5 text-right font-medium">CTR</th>
                <th className="px-4 py-2.5 text-right font-medium">CPL</th>
                <th className="px-4 py-2.5 text-right font-medium">Leads</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.data.campaigns.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-neutral-400"
                  >
                    No campaigns in this ad account.
                  </td>
                </tr>
              )}
              {campaigns.data.campaigns.map((campaign) => {
                const metrics = metricsByCampaign.get(campaign.id);
                return (
                  <tr
                    key={campaign.id}
                    className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-neutral-900">
                        {campaign.name}
                      </div>
                      <div className="text-xs text-neutral-400">
                        {campaign.objective}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill status={campaign.effectiveStatus} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {metrics ? formatMoney(metrics.spend) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {metrics ? formatCount(metrics.impressions) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {metrics?.ctr !== undefined
                        ? `${metrics.ctr.toFixed(2)}%`
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {metrics?.cpl !== undefined
                        ? formatMoney(metrics.cpl)
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {metrics ? formatCount(metrics.leads) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {breakdown.isError && (
        <p className="mt-3 text-xs text-amber-700">
          Metrics unavailable: {breakdown.error.message}
        </p>
      )}
      <p className="mt-3 text-xs text-neutral-400">
        Status pills mirror Meta's own campaign status — this screen is a
        read-only mirror, not a source of truth.
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const styles: Record<string, string> = {
    ACTIVE: 'border-green-600 text-green-700 bg-green-50',
    PAUSED: 'border-neutral-300 text-neutral-500 bg-neutral-50',
    IN_PROCESS: 'border-amber-500 text-amber-700 bg-amber-50',
    PENDING_REVIEW: 'border-amber-500 text-amber-700 bg-amber-50',
    WITH_ISSUES: 'border-red-500 text-red-700 bg-red-50',
    DISAPPROVED: 'border-red-500 text-red-700 bg-red-50',
  };
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        styles[normalized] ?? 'border-neutral-300 text-neutral-500 bg-neutral-50'
      }`}
    >
      {normalized.replaceAll('_', ' ').toLowerCase()}
    </span>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-8 text-center text-sm text-neutral-400">
      {text}
    </div>
  );
}

function ErrorNote({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {text}
    </div>
  );
}

function last30Days(): { since: string; until: string } {
  const until = new Date();
  const since = new Date(until);
  since.setDate(since.getDate() - 30);
  return { since: isoDate(since), until: isoDate(until) };
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatMoney(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 100 ? 0 : 2,
  });
}

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toLocaleString('en-US');
}
