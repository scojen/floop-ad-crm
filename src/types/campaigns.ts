/**
 * Hand-mirrored response shapes from ad-manager-api's campaigns and
 * insights modules. Keep in sync with:
 *   ad-manager-api/src/modules/campaigns/dto/campaign.dto.ts
 *   ad-manager-api/src/modules/insights/dto/performance-*.dto.ts
 */

export interface Campaign {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string;
  objective: string;
  buyingType?: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  createdTime?: string;
  updatedTime?: string;
}

export interface CampaignListResponse {
  clientId: string;
  campaigns: Campaign[];
}

export interface AdSet {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  optimizationGoal?: string;
  billingEvent?: string;
}

export interface Ad {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string;
  creativeId?: string;
}

export interface CampaignDetailsResponse {
  clientId: string;
  campaign: Campaign;
  adsets: AdSet[];
  ads: Ad[];
}

export interface PerformanceRow {
  campaignId?: string;
  campaignName?: string;
  adsetId?: string;
  adsetName?: string;
  adId?: string;
  adName?: string;
  spend: number;
  impressions: number;
  reach?: number;
  clicks: number;
  leads: number;
  purchases: number;
  purchaseValue: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  cpl?: number;
  cpa?: number;
  roas?: number;
}

export interface PerformanceBreakdownResponse {
  clientId: string;
  period: { since: string; until: string };
  level: string;
  rows: PerformanceRow[];
  truncated: boolean;
  pagesFetched: number;
}

export interface PerformanceSummaryResponse {
  clientId: string;
  period: { since: string; until: string };
  currency: string;
  metrics: {
    spend: number;
    impressions: number;
    reach?: number;
    clicks: number;
    ctr?: number;
    cpc?: number;
    cpm?: number;
    leads: number;
    purchases: number;
    purchaseValue: number;
    cpl?: number;
    cpa?: number;
    roas?: number;
  };
}
