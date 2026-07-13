import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { clientPath, getJson, postJson } from './crmClient';
import type {
  CampaignListResponse,
  PerformanceBreakdownResponse,
} from '../types/campaigns';
import type {
  Connection,
  ConnectionsListResponse,
  CrmPlatform,
  CrmUsersListResponse,
  SyncLogListResponse,
} from '../types/crm';

export const queryKeys = {
  users: ['crm', 'users'] as const,
  campaigns: ['crm', 'campaigns'] as const,
  breakdown: (since: string, until: string) =>
    ['crm', 'breakdown', since, until] as const,
  connections: ['crm', 'connections'] as const,
  syncLog: (platform: CrmPlatform) => ['crm', 'sync-log', platform] as const,
};

export function useCrmUsers() {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: () => getJson<CrmUsersListResponse>('/crm/users'),
    staleTime: 5 * 60_000,
  });
}

export function useCampaigns() {
  return useQuery({
    queryKey: queryKeys.campaigns,
    queryFn: () => getJson<CampaignListResponse>(clientPath('/campaigns')),
  });
}

/** Campaign-level spend/CTR/CPL/leads for the campaigns table. */
export function useCampaignBreakdown(since: string, until: string) {
  return useQuery({
    queryKey: queryKeys.breakdown(since, until),
    queryFn: () =>
      getJson<PerformanceBreakdownResponse>(
        clientPath(
          `/performance/breakdown?since=${since}&until=${until}&level=campaign`,
        ),
      ),
  });
}

export function useConnections() {
  return useQuery({
    queryKey: queryKeys.connections,
    queryFn: () =>
      getJson<ConnectionsListResponse>(clientPath('/crm/connections')),
    refetchInterval: 60_000,
  });
}

export function useSyncLog(platform: CrmPlatform) {
  return useQuery({
    queryKey: queryKeys.syncLog(platform),
    queryFn: () =>
      getJson<SyncLogListResponse>(
        clientPath(`/crm/connections/${platform.toLowerCase()}/sync-log`),
      ),
  });
}

export function useTestConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (platform: CrmPlatform) =>
      postJson<Connection>(
        clientPath(`/crm/connections/${platform.toLowerCase()}/test`),
      ),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.connections });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'sync-log'] });
    },
  });
}
