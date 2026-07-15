/**
 * Hand-mirrored from ad-manager-api:
 *   src/modules/planning/briefs/dto/campaign-brief.dto.ts
 */
import type { BriefFormValues } from '../lib/schema/campaign-brief';
import type { GateResult } from '../lib/gates/types';

export type BriefStatus = 'DRAFT' | 'SUBMITTED';

export interface BriefSummary {
  id: string;
  name: string;
  status: BriefStatus;
  blockingCount: number;
  warningCount: number;
  overrideCount: number;
  updatedAt: string;
  updatedByName: string | null;
  submittedAt: string | null;
}

export interface Brief extends BriefSummary {
  payload: Record<string, unknown>;
  gateSnapshot: GateResult[] | null;
  calcSnapshot: Record<string, unknown> | null;
  overrides: BriefFormValues['overrides'];
  acknowledgments: BriefFormValues['acknowledgments'];
  artifactMarkdown: string | null;
  gateEngineVersion: string | null;
  createdAt: string;
}

export interface BriefsListResponse {
  briefs: BriefSummary[];
}

export interface SaveDraftBody {
  payload: BriefFormValues;
  gateSnapshot?: GateResult[];
  calcSnapshot?: Record<string, unknown>;
  acknowledgments?: BriefFormValues['acknowledgments'];
  overrides?: BriefFormValues['overrides'];
  gateEngineVersion?: string;
}

export interface SubmitResponse {
  brief: Brief;
  artifacts: {
    briefJson: Record<string, unknown>;
    markdown: string;
  };
}
