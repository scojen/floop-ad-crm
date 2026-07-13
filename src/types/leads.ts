/**
 * Hand-mirrored from ad-manager-api:
 *   src/modules/crm/leads/dto/crm-lead-response.dto.ts
 *   src/shared/enums/lead-*.enum.ts, pipeline-stage.enum.ts
 */
import type { CrmPlatform } from './crm';

export const TriageStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DISCARDED: 'DISCARDED',
  MERGED: 'MERGED',
} as const;
export type TriageStatus = (typeof TriageStatus)[keyof typeof TriageStatus];

export const DiscardReason = {
  JUNK: 'JUNK',
  DUPLICATE: 'DUPLICATE',
  SPAM: 'SPAM',
  NOT_SERVICEABLE: 'NOT_SERVICEABLE',
  OTHER: 'OTHER',
} as const;
export type DiscardReason = (typeof DiscardReason)[keyof typeof DiscardReason];

export const PipelineStage = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUALIFIED: 'QUALIFIED',
  WON: 'WON',
  LOST: 'LOST',
} as const;
export type PipelineStage = (typeof PipelineStage)[keyof typeof PipelineStage];

export const LeadOutcome = {
  NONE: 'NONE',
  QUALIFIED: 'QUALIFIED',
  NOT_A_FIT: 'NOT_A_FIT',
  WON: 'WON',
  LOST: 'LOST',
} as const;
export type LeadOutcome = (typeof LeadOutcome)[keyof typeof LeadOutcome];

export interface LeadClaimant {
  id: string;
  displayName: string;
  avatarColor: string | null;
}

export interface LeadFormAnswer {
  name: string;
  values: string[];
}

export interface CrmLead {
  id: string;
  platform: CrmPlatform;
  externalLeadId: string;
  externalFormId: string | null;
  externalCampaignId: string | null;
  externalAdsetId: string | null;
  externalAdId: string | null;
  campaignName: string | null;
  adsetName: string | null;
  adName: string | null;
  sourceChannel: 'WEBHOOK' | 'POLL' | 'BACKFILL' | 'MANUAL';
  submittedAt: string;
  contactId: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  formAnswers: LeadFormAnswer[];
  triageStatus: TriageStatus;
  discardReason: DiscardReason | null;
  discardNote: string | null;
  qualityFlags: string[];
  pipelineStage: PipelineStage | null;
  stageEnteredAt: string | null;
  lastActivityAt: string | null;
  claimedBy: LeadClaimant | null;
  claimedAt: string | null;
  outcome: LeadOutcome;
  outcomeSetAt: string | null;
  createdAt: string;
}

export interface CrmLeadsListResponse {
  leads: CrmLead[];
  total: number;
  limit: number;
  offset: number;
}
