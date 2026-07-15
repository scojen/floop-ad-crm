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
  'SERVICES_BOOKINGS',
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
  SERVICES_BOOKINGS: 'Local services — online bookings',
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

/**
 * The ECONOMIC SHAPE: what "the unit" is and which vocabulary §1 speaks.
 * Six shapes, but only two math engines underneath —
 *   linear cost build (revenue per unit − variable costs) and
 *   probability chain (end value × conversion rates).
 * The shape decides labels, which fields appear, and how the verdict is
 * framed (per-unit ROAS vs LTV:CAC + payback).
 */
export const ECONOMIC_SHAPES = [
  'PER_ORDER', // unit: order (DTC ecom, info products)
  'TAKE_RATE', // unit: transaction — the business keeps GMV × take%
  'SUBSCRIBER', // unit: subscriber — first-period contribution + LTV-led verdict
  'PIPELINE', // unit: raw lead — value per close × funnel probabilities
  'APP', // unit: install — ARPPU × activation × payer conversion
  'BOOKING', // unit: booking — average ticket, no-shows as "returns"
] as const;
export type EconomicShape = (typeof ECONOMIC_SHAPES)[number];

export function economicShapeFor(
  vertical: Vertical | null,
  businessModel: BusinessModel | null,
): EconomicShape {
  switch (vertical) {
    case 'MARKETPLACE_ECOM':
      return 'TAKE_RATE';
    case 'SUBSCRIPTION':
      return 'SUBSCRIBER';
    case 'LEADGEN_LOCAL':
    case 'LEADGEN_PROFESSIONAL':
    case 'B2B_SAAS':
      return 'PIPELINE';
    case 'APP':
      return 'APP';
    case 'SERVICES_BOOKINGS':
      return 'BOOKING';
    default:
      // DTC_ECOM / OTHER: a subscription business model flips the frame
      // to subscriber economics even outside the SUBSCRIPTION vertical.
      return businessModel === 'SUBSCRIPTION' ? 'SUBSCRIBER' : 'PER_ORDER';
  }
}

/** Which math engine a shape runs on. */
export function engineFor(shape: EconomicShape): 'linear' | 'chain' {
  return shape === 'PIPELINE' || shape === 'APP' ? 'chain' : 'linear';
}

/** Shapes whose verdict is framed in per-unit ROAS (vs LTV:CAC + payback). */
export function roasFramed(shape: EconomicShape): boolean {
  return shape === 'PER_ORDER' || shape === 'TAKE_RATE' || shape === 'BOOKING';
}

/**
 * Which §1 contribution build a vertical requires ('ecom' = linear engine,
 * 'leadGen' = probability chain). Kept for the many call sites that only
 * need the engine; APP is a chain build (install → activation → payer).
 */
export function requiredBuildFor(
  vertical: Vertical | null,
): 'ecom' | 'leadGen' {
  return engineFor(economicShapeFor(vertical, null)) === 'chain'
    ? 'leadGen'
    : 'ecom';
}

/**
 * The intent fork: business objective comes before the platform objective
 * (SOSTAC ordering). Direct response is gated on unit economics; awareness
 * swaps §1 for an investment rationale and REQUIRES a lift measurement
 * plan — different evidence standard, same accountability.
 */
export const CAMPAIGN_INTENTS = ['DIRECT_RESPONSE', 'AWARENESS'] as const;
export type CampaignIntent = (typeof CAMPAIGN_INTENTS)[number];

export const s0Schema = z.object({
  clientName: z.string(),
  vertical: z.enum(VERTICALS).nullable(),
  businessModel: z.enum(BUSINESS_MODELS).nullable(),
  campaignIntent: z.enum(CAMPAIGN_INTENTS).nullable(),
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
  campaignIntent: null,
  engagementStart: null,
  mediaLead: '',
  creativeLead: '',
  backendDataAccess: null,
});
