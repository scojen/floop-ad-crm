/**
 * Hand-mirrored from ad-manager-api:
 *   src/modules/crm/leads/dto/pipeline-stats-response.dto.ts
 *   src/modules/crm/activities/dto/activity.dto.ts
 */
import type { PipelineStage } from './leads';

export interface PipelineStageCount {
  stage: PipelineStage;
  count: number;
}

export interface PipelineStatsResponse {
  stages: PipelineStageCount[];
  unclaimedCount: number;
  oldestUnclaimedAgeSeconds: number | null;
  avgTimeToClaimSeconds7d: number | null;
  qualifiedRate7d: number | null;
}

export type ActivityType =
  | 'NOTE'
  | 'CALL'
  | 'SMS'
  | 'EMAIL'
  | 'STAGE_CHANGE'
  | 'CLAIM'
  | 'RELEASE'
  | 'TRIAGE'
  | 'OUTCOME'
  | 'TASK'
  | 'AUTOMATION'
  | 'SYSTEM';

export interface ActivityActor {
  id: string;
  displayName: string;
  avatarColor: string | null;
}

export interface Activity {
  id: string;
  type: ActivityType;
  body: string | null;
  metadata: Record<string, unknown> | null;
  actor: ActivityActor | null;
  occurredAt: string;
}

export interface ActivitiesListResponse {
  activities: Activity[];
}
