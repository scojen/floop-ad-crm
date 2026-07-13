import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { clientPath, getJson, patchJson, postJson } from './crmClient';
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
import type {
  CrmLead,
  CrmLeadsListResponse,
  DiscardReason,
  LeadOutcome,
  PipelineStage,
} from '../types/leads';
import type {
  ActivitiesListResponse,
  Activity,
  ActivityType,
  PipelineStatsResponse,
} from '../types/pipeline';

export const queryKeys = {
  users: ['crm', 'users'] as const,
  campaigns: ['crm', 'campaigns'] as const,
  breakdown: (since: string, until: string) =>
    ['crm', 'breakdown', since, until] as const,
  connections: ['crm', 'connections'] as const,
  syncLog: (platform: CrmPlatform) => ['crm', 'sync-log', platform] as const,
  inbox: ['crm', 'inbox'] as const,
  lead: (id: string) => ['crm', 'lead', id] as const,
  board: ['crm', 'board'] as const,
  pipelineStats: ['crm', 'pipeline-stats'] as const,
  activities: (leadId: string) => ['crm', 'activities', leadId] as const,
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

export function useInboxLeads() {
  return useQuery({
    queryKey: queryKeys.inbox,
    queryFn: () =>
      getJson<CrmLeadsListResponse>(clientPath('/crm/leads?view=inbox')),
    // Shared queue: keep the list fresh so reps see each other's claims.
    refetchInterval: 30_000,
  });
}

/** Optimistically removes a lead row from the inbox cache. */
function removeFromInbox(
  queryClient: ReturnType<typeof useQueryClient>,
  leadId: string,
): CrmLeadsListResponse | undefined {
  const previous = queryClient.getQueryData<CrmLeadsListResponse>(
    queryKeys.inbox,
  );
  if (previous) {
    queryClient.setQueryData<CrmLeadsListResponse>(queryKeys.inbox, {
      ...previous,
      leads: previous.leads.filter((lead) => lead.id !== leadId),
      total: previous.total - 1,
    });
  }
  return previous;
}

function useInboxRowMutation<TVariables extends { leadId: string }>(
  mutationFn: (variables: TVariables) => Promise<CrmLead>,
  options?: { optimisticRemove?: boolean },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: (variables: TVariables) => {
      if (!options?.optimisticRemove) {
        return { previous: undefined };
      }
      return { previous: removeFromInbox(queryClient, variables.leadId) };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.inbox, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inbox });
      void queryClient.invalidateQueries({ queryKey: queryKeys.board });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.pipelineStats,
      });
    },
  });
}

export function useAcceptLead() {
  return useInboxRowMutation(
    ({ leadId }: { leadId: string }) =>
      postJson<CrmLead>(clientPath(`/crm/leads/${leadId}/accept`)),
    { optimisticRemove: true },
  );
}

export function useDiscardLead() {
  return useInboxRowMutation(
    ({
      leadId,
      reason,
      note,
    }: {
      leadId: string;
      reason: DiscardReason;
      note?: string;
    }) =>
      postJson<CrmLead>(clientPath(`/crm/leads/${leadId}/discard`), {
        reason,
        note,
      }),
    { optimisticRemove: true },
  );
}

export function useClaimLead() {
  return useInboxRowMutation(({ leadId }: { leadId: string }) =>
    postJson<CrmLead>(clientPath(`/crm/leads/${leadId}/claim`)),
  );
}

export function useReleaseLead() {
  return useInboxRowMutation(({ leadId }: { leadId: string }) =>
    postJson<CrmLead>(clientPath(`/crm/leads/${leadId}/release`)),
  );
}

export function useBulkLeadAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      leadIds: string[];
      action: 'ACCEPT' | 'DISCARD';
      reason?: DiscardReason;
      note?: string;
    }) =>
      postJson<{ processed: number; skipped: number }>(
        clientPath('/crm/leads/bulk-action'),
        input,
      ),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inbox });
    },
  });
}

export function useBoard() {
  return useQuery({
    queryKey: queryKeys.board,
    queryFn: () =>
      getJson<CrmLeadsListResponse>(clientPath('/crm/pipeline/board')),
    refetchInterval: 30_000,
  });
}

export function usePipelineStats() {
  return useQuery({
    queryKey: queryKeys.pipelineStats,
    queryFn: () =>
      getJson<PipelineStatsResponse>(clientPath('/crm/pipeline/stats')),
    refetchInterval: 30_000,
  });
}

export function useLead(leadId: string) {
  return useQuery({
    queryKey: queryKeys.lead(leadId),
    queryFn: () => getJson<CrmLead>(clientPath(`/crm/leads/${leadId}`)),
  });
}

export function useActivities(leadId: string) {
  return useQuery({
    queryKey: queryKeys.activities(leadId),
    queryFn: () =>
      getJson<ActivitiesListResponse>(
        clientPath(`/crm/leads/${leadId}/activities`),
      ),
  });
}

/** Drag-and-drop stage move with optimistic board update + rollback. */
export function useUpdateStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      leadId,
      stage,
    }: {
      leadId: string;
      stage: PipelineStage;
    }) =>
      patchJson<CrmLead>(clientPath(`/crm/leads/${leadId}/stage`), { stage }),
    onMutate: ({ leadId, stage }) => {
      const previous = queryClient.getQueryData<CrmLeadsListResponse>(
        queryKeys.board,
      );
      if (previous) {
        queryClient.setQueryData<CrmLeadsListResponse>(queryKeys.board, {
          ...previous,
          leads: previous.leads.map((lead) =>
            lead.id === leadId
              ? {
                  ...lead,
                  pipelineStage: stage,
                  stageEnteredAt: new Date().toISOString(),
                }
              : lead,
          ),
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.board, context.previous);
      }
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.board });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.pipelineStats,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.lead(variables.leadId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.activities(variables.leadId),
      });
    },
  });
}

export function useSetOutcome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      leadId,
      outcome,
    }: {
      leadId: string;
      outcome: LeadOutcome;
    }) =>
      patchJson<CrmLead>(clientPath(`/crm/leads/${leadId}/outcome`), {
        outcome,
      }),
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.lead(variables.leadId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.activities(variables.leadId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.board });
    },
  });
}

export function useLogActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      leadId,
      type,
      body,
    }: {
      leadId: string;
      type: ActivityType;
      body: string;
    }) =>
      postJson<Activity>(clientPath(`/crm/leads/${leadId}/activities`), {
        type,
        body,
      }),
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.activities(variables.leadId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.lead(variables.leadId),
      });
    },
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
