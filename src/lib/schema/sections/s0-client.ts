import { z } from 'zod';
import { isoDate } from '../primitives';

export const VERTICALS = [
  'DTC_ECOM',
  'MARKETPLACE_ECOM',
  'LEADGEN_LOCAL',
  'LEADGEN_PROFESSIONAL',
  'B2B_SAAS',
  'SUBSCRIPTION',
  'APP',
  'OTHER',
] as const;
export type Vertical = (typeof VERTICALS)[number];

export const VERTICAL_LABELS: Record<Vertical, string> = {
  DTC_ECOM: 'DTC ecom',
  MARKETPLACE_ECOM: 'Marketplace ecom',
  LEADGEN_LOCAL: 'Lead gen — local service',
  LEADGEN_PROFESSIONAL: 'Lead gen — professional service',
  B2B_SAAS: 'B2B SaaS',
  SUBSCRIPTION: 'Subscription',
  APP: 'App',
  OTHER: 'Other',
};

export const BUSINESS_MODELS = [
  'ONE_TIME',
  'REPEAT',
  'SUBSCRIPTION',
  'HIGH_TICKET',
  'MARKETPLACE',
] as const;
export type BusinessModel = (typeof BUSINESS_MODELS)[number];

export const BUSINESS_MODEL_LABELS: Record<BusinessModel, string> = {
  ONE_TIME: 'One-time purchase',
  REPEAT: 'Repeat purchase',
  SUBSCRIPTION: 'Subscription',
  HIGH_TICKET: 'High-ticket services',
  MARKETPLACE: 'Marketplace',
};

/** Which §1 contribution build a vertical requires. */
export function requiredBuildFor(
  vertical: Vertical | null,
): 'ecom' | 'leadGen' {
  switch (vertical) {
    case 'LEADGEN_LOCAL':
    case 'LEADGEN_PROFESSIONAL':
    case 'B2B_SAAS':
      return 'leadGen';
    default:
      return 'ecom';
  }
}

export const s0Schema = z.object({
  clientName: z.string(),
  vertical: z.enum(VERTICALS).nullable(),
  businessModel: z.enum(BUSINESS_MODELS).nullable(),
  engagementStart: isoDate,
  mediaLead: z.string(),
  creativeLead: z.string(),
  backendDataAccess: z.enum(['full', 'partial', 'none']).nullable(),
});
export type S0Values = z.infer<typeof s0Schema>;

export const emptyS0 = (): S0Values => ({
  clientName: '',
  vertical: null,
  businessModel: null,
  engagementStart: null,
  mediaLead: '',
  creativeLead: '',
  backendDataAccess: null,
});
