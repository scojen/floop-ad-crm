/**
 * Hand-mirrored response shapes from ad-manager-api's CRM module.
 * Keep in sync with:
 *   ad-manager-api/src/modules/crm/users/dto/crm-user-response.dto.ts
 *   ad-manager-api/src/modules/crm/connections/dto/*.dto.ts
 */

export const CrmPlatform = {
  META: 'META',
  TIKTOK: 'TIKTOK',
  LINKEDIN: 'LINKEDIN',
} as const;
export type CrmPlatform = (typeof CrmPlatform)[keyof typeof CrmPlatform];

export const ConnectionStatus = {
  CONNECTED: 'CONNECTED',
  EXPIRING: 'EXPIRING',
  NEEDS_REAUTH: 'NEEDS_REAUTH',
  ERROR: 'ERROR',
  DISABLED: 'DISABLED',
} as const;
export type ConnectionStatus =
  (typeof ConnectionStatus)[keyof typeof ConnectionStatus];

export interface CrmUser {
  id: string;
  displayName: string;
  email: string | null;
  avatarColor: string | null;
}

export interface CrmUsersListResponse {
  users: CrmUser[];
}

export interface Connection {
  id: string;
  platform: CrmPlatform;
  status: ConnectionStatus;
  lastCheckedAt: string | null;
  lastSuccessfulSyncAt: string | null;
  lastWebhookAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, string> | null;
}

export interface ConnectionsListResponse {
  connections: Connection[];
}

export interface SyncLogEntry {
  id: string;
  platform: CrmPlatform;
  eventType:
    | 'WEBHOOK_RECEIVED'
    | 'POLL_RUN'
    | 'BACKFILL_RUN'
    | 'TOKEN_CHECK'
    | 'CAPI_DISPATCH';
  status: 'SUCCESS' | 'FAILURE' | 'SKIPPED';
  detail: Record<string, unknown> | null;
  createdAt: string;
}

export interface SyncLogListResponse {
  entries: SyncLogEntry[];
}
