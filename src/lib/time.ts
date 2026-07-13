export function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

/** Speed-to-lead SLA coloring: default threshold 2h, hard-red at 1 day. */
export function ageSeverity(iso: string): 'ok' | 'warn' | 'late' {
  const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (hours >= 24) return 'late';
  if (hours >= 2) return 'warn';
  return 'ok';
}
