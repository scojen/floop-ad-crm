/**
 * Hand-mirrored from ad-manager-api:
 *   src/modules/crm/tasks/dto/task.dto.ts
 *   src/modules/crm/automations/dto/automation.dto.ts
 *   src/modules/crm/reports/dto/reports.dto.ts
 */

export type TaskStatus = 'OPEN' | 'DONE' | 'CANCELLED';
export type TaskBucket = 'overdue' | 'today' | 'upcoming';

export interface CrmTask {
  id: string;
  title: string;
  dueAt: string;
  status: TaskStatus;
  completedAt: string | null;
  assignee: {
    id: string;
    displayName: string;
    avatarColor: string | null;
  } | null;
  lead: {
    id: string;
    fullName: string | null;
    campaignName: string | null;
    pipelineStage: string | null;
  };
  createdAt: string;
}

export interface TasksListResponse {
  tasks: CrmTask[];
}

export type AutomationTriggerType =
  | 'LEAD_CREATED'
  | 'STAGE_CHANGED'
  | 'TIME_IN_STAGE_EXCEEDED'
  | 'FORM_FIELD_EQUALS';

export type AutomationActionType =
  | 'ASSIGN_OWNER'
  | 'CREATE_TASK'
  | 'FIRE_CAPI_EVENT';

export interface AutomationRule {
  id: string;
  name: string;
  triggerType: AutomationTriggerType;
  triggerConfig: Record<string, unknown>;
  actionType: AutomationActionType;
  actionConfig: Record<string, unknown>;
  isEnabled: boolean;
  createdAt: string;
}

export interface AutomationRulesListResponse {
  rules: AutomationRule[];
}

export interface AutomationRun {
  id: string;
  leadId: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  errorMessage: string | null;
  context: Record<string, unknown> | null;
  triggeredAt: string;
}

export interface AutomationRunsListResponse {
  runs: AutomationRun[];
}

export interface FunnelRow {
  campaignId: string | null;
  campaignName: string | null;
  leads: number;
  accepted: number;
  discarded: number;
  qualified: number;
  won: number;
}

export interface FunnelReportResponse {
  sinceDays: number;
  totals: FunnelRow;
  rows: FunnelRow[];
}

export interface CpqlRow {
  campaignId: string | null;
  campaignName: string | null;
  spend: number;
  leads: number;
  qualified: number;
  costPerLead: number | null;
  costPerQualifiedLead: number | null;
}

export interface CpqlReportResponse {
  since: string;
  until: string;
  currency: string | null;
  totals: Omit<CpqlRow, 'campaignId' | 'campaignName'>;
  rows: CpqlRow[];
}

export interface CreativePerformanceRow {
  adId: string | null;
  adName: string | null;
  campaignName: string | null;
  leads: number;
  accepted: number;
  qualified: number;
  qualifiedRate: number | null;
}

export interface CreativePerformanceResponse {
  sinceDays: number;
  rows: CreativePerformanceRow[];
}
