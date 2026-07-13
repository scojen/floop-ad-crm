import { useState } from 'react';
import { useConnections, useSyncLog, useTestConnection } from '../api/queries';
import type { Connection, ConnectionStatus, CrmPlatform } from '../types/crm';
import { CrmPlatform as Platform } from '../types/crm';

const PLATFORM_LABELS: Record<CrmPlatform, string> = {
  META: 'Meta',
  TIKTOK: 'TikTok',
  LINKEDIN: 'LinkedIn',
};

/**
 * Status-forward connections screen: "can I trust my data pipeline right
 * now", answerable in one glance. Meta is live; TikTok/LinkedIn are
 * placeholders until their adapters exist.
 */
export function ConnectionsPage() {
  const connections = useConnections();
  const testConnection = useTestConnection();
  const [testError, setTestError] = useState<string | null>(null);

  const byPlatform = new Map<CrmPlatform, Connection>(
    (connections.data?.connections ?? []).map((connection) => [
      connection.platform,
      connection,
    ]),
  );

  const handleTest = (platform: CrmPlatform) => {
    setTestError(null);
    testConnection.mutate(platform, {
      onError: (error) => setTestError(error.message),
    });
  };

  return (
    <div>
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">Connections</h2>
        <p className="text-sm text-neutral-500">
          Ad platform credentials and sync health — single tenant, your own
          accounts.
        </p>
      </header>

      {connections.isError && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn't load connections: {connections.error.message}
        </div>
      )}
      {testError && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Test failed: {testError}
        </div>
      )}

      <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
        {(Object.keys(PLATFORM_LABELS) as CrmPlatform[]).map((platform) => {
          const connection = byPlatform.get(platform);
          const implemented = platform === Platform.META;
          return (
            <div
              key={platform}
              className="flex items-center gap-4 px-4 py-4"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-xs font-semibold text-neutral-500">
                {PLATFORM_LABELS[platform][0]}
              </div>
              <div className="w-32 shrink-0">
                <div className="text-sm font-semibold text-neutral-900">
                  {PLATFORM_LABELS[platform]}
                </div>
                <div className="text-xs text-neutral-400">
                  {implemented
                    ? (connection?.metadata?.pageName ?? 'System User token')
                    : 'Not yet supported'}
                </div>
              </div>
              <div className="flex-1">
                <StatusBadge
                  status={connection?.status ?? 'DISABLED'}
                  implemented={implemented}
                />
                {connection?.errorMessage && (
                  <div className="mt-1 text-xs text-neutral-400">
                    {connection.errorMessage}
                  </div>
                )}
              </div>
              <div className="w-40 shrink-0 text-xs text-neutral-400">
                {connection?.lastCheckedAt
                  ? `Checked ${timeAgo(connection.lastCheckedAt)}`
                  : 'Never checked'}
              </div>
              <div className="shrink-0">
                {implemented && (
                  <button
                    type="button"
                    disabled={testConnection.isPending}
                    onClick={() => handleTest(platform)}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-400 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {testConnection.isPending ? 'Testing…' : 'Test'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <SyncLogPanel platform={Platform.META} />
    </div>
  );
}

function StatusBadge({
  status,
  implemented,
}: {
  status: ConnectionStatus;
  implemented: boolean;
}) {
  if (!implemented) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-2.5 py-0.5 text-xs text-neutral-400">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
        Planned
      </span>
    );
  }
  const styles: Record<ConnectionStatus, { badge: string; dot: string; label: string }> = {
    CONNECTED: {
      badge: 'border-green-600 text-green-700',
      dot: 'bg-green-600',
      label: 'Connected',
    },
    EXPIRING: {
      badge: 'border-amber-500 text-amber-700',
      dot: 'bg-amber-500',
      label: 'Expiring soon',
    },
    NEEDS_REAUTH: {
      badge: 'border-red-500 text-red-700',
      dot: 'bg-red-500',
      label: 'Needs reauth',
    },
    ERROR: {
      badge: 'border-red-500 text-red-700',
      dot: 'bg-red-500',
      label: 'Error',
    },
    DISABLED: {
      badge: 'border-neutral-300 text-neutral-500',
      dot: 'bg-neutral-400',
      label: 'Not checked yet',
    },
  };
  const style = styles[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

function SyncLogPanel({ platform }: { platform: CrmPlatform }) {
  const syncLog = useSyncLog(platform);

  return (
    <section className="mt-5 rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        Sync log — {PLATFORM_LABELS[platform]}
      </h3>
      <div className="mt-2 divide-y divide-neutral-100">
        {syncLog.data?.entries.length === 0 && (
          <p className="py-3 text-sm text-neutral-400">
            No events yet. Hit "Test" or wait for the scheduled healthcheck.
          </p>
        )}
        {syncLog.data?.entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between py-2 text-sm"
          >
            <span className="text-neutral-700">
              {describeEvent(entry.eventType)}{' '}
              <span
                className={
                  entry.status === 'SUCCESS'
                    ? 'text-green-700'
                    : entry.status === 'SKIPPED'
                      ? 'text-neutral-400'
                      : 'text-red-600'
                }
              >
                — {entry.status.toLowerCase()}
              </span>
            </span>
            <span className="text-xs text-neutral-400">
              {timeAgo(entry.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function describeEvent(eventType: string): string {
  const labels: Record<string, string> = {
    WEBHOOK_RECEIVED: 'Webhook received',
    POLL_RUN: 'Lead poll run',
    BACKFILL_RUN: 'Backfill run',
    TOKEN_CHECK: 'Token healthcheck',
    CAPI_DISPATCH: 'CAPI dispatch',
  };
  return labels[eventType] ?? eventType;
}

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
