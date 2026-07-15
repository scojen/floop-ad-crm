/**
 * Starter templates from the playbook's integrated case studies (ch. 14).
 * Solves the blank-page problem: users learn the form by editing believable
 * numbers instead of composing from nothing. Only S0/S1 are prefilled —
 * objectives, measurement, and structure are the user's homework.
 */
import { emptyBrief, type BriefFormValues } from './schema/campaign-brief';

export interface Archetype {
  id: string;
  name: string;
  description: string;
  /** What the numbers will teach when loaded. */
  lesson: string;
  build: () => BriefFormValues;
}

export const ARCHETYPES: Archetype[] = [
  {
    id: 'vellum',
    name: 'VELLUM — DTC skincare',
    description: 'Healthy mid-margin ecommerce. $72 AOV, ~48% contribution.',
    lesson: 'A clean base case: break-even ~2.1x, target ~2.4x. No gates fire.',
    build: () => {
      const brief = emptyBrief();
      brief.s0 = {
        ...brief.s0,
        campaignIntent: 'DIRECT_RESPONSE',
        clientName: 'Vellum',
        vertical: 'DTC_ECOM',
        businessModel: 'REPEAT',
        backendDataAccess: 'full',
      };
      brief.s1.ecom = {
        ...brief.s1.ecom,
        aov: 72,
        promo: { mode: 'percent', value: 0 },
        cogs: 24,
        fulfillment: 7,
        paymentPct: 2.9,
        paymentFixed: 0.3,
        expectedReturnsPct: 5,
        variableCsPackaging: 0.7,
      };
      brief.s1.targets.requiredContributionAfterAds = 5;
      return brief;
    },
  },
  {
    id: 'kettle',
    name: 'KETTLE & CO — low-margin commerce',
    description: '$145 AOV but only ~$13 contribution per order.',
    lesson:
      'The teaching case for "fix the P&L, not the campaign": break-even lands above 10x and the form blocks. Try the what-if levers.',
    build: () => {
      const brief = emptyBrief();
      brief.s0 = {
        ...brief.s0,
        campaignIntent: 'DIRECT_RESPONSE',
        clientName: 'Kettle & Co',
        vertical: 'DTC_ECOM',
        businessModel: 'ONE_TIME',
        backendDataAccess: 'full',
      };
      brief.s1.ecom = {
        ...brief.s1.ecom,
        aov: 145,
        promo: { mode: 'percent', value: 0 },
        cogs: 105,
        fulfillment: 19.5,
        paymentPct: 0,
        paymentFixed: 0,
        expectedReturnsPct: 5,
        variableCsPackaging: 0,
      };
      brief.s1.targets.requiredContributionAfterAds = 8;
      return brief;
    },
  },
  {
    id: 'axiom',
    name: 'AXIOM — coffee subscription',
    description: '$15.60/mo contribution per subscriber; economics live in retention.',
    lesson:
      'Watch the LTV, payback, and cash rows populate — subscription math is cohort math, not first-order math.',
    build: () => {
      const brief = emptyBrief();
      brief.s0 = {
        ...brief.s0,
        campaignIntent: 'DIRECT_RESPONSE',
        clientName: 'Axiom Coffee',
        vertical: 'SUBSCRIPTION',
        businessModel: 'SUBSCRIPTION',
        backendDataAccess: 'full',
      };
      brief.s1.ecom = {
        ...brief.s1.ecom,
        aov: 89,
        promo: { mode: 'percent', value: 10 },
        cogs: 26,
        fulfillment: 8,
        paymentPct: 2.9,
        paymentFixed: 0.3,
        expectedReturnsPct: 2,
      };
      brief.s1.targets.requiredContributionAfterAds = 5;
      brief.s1.ltv = {
        ...brief.s1.ltv,
        contributionPerMonth: 15.6,
        retention: { mode: 'months', value: 10 },
        discountRateAnnualPct: 12,
        plannedMonthlySpend: 10000,
      };
      return brief;
    },
  },
  {
    id: 'northridge',
    name: 'NORTHRIDGE DENTAL — local implants',
    description: 'High-value local lead gen: $1,350 collected contribution per case.',
    lesson:
      'Lead economics: the funnel product prices a raw lead (~$128 EV) and derives the allowable CPL.',
    build: () => {
      const brief = emptyBrief();
      brief.s0 = {
        ...brief.s0,
        campaignIntent: 'DIRECT_RESPONSE',
        clientName: 'Northridge Dental',
        vertical: 'LEADGEN_LOCAL',
        businessModel: 'HIGH_TICKET',
        backendDataAccess: 'partial',
      };
      brief.s1.leadGen = {
        contributionPerClose: 1350,
        pQualGivenLeadPct: 45,
        pApptGivenQualPct: 60,
        pCloseGivenApptPct: 35,
      };
      brief.s1.targets.requiredContributionAfterAds = 25;
      return brief;
    },
  },
  {
    id: 'harbor',
    name: 'HARBOR LEGAL — high-value, low-volume leads',
    description: '$9,000 collected per case, brutal funnel decay, few events.',
    lesson:
      'The low-volume case: even great case economics can be structurally unable to exit the learning phase — watch §4 when you set a CPA.',
    build: () => {
      const brief = emptyBrief();
      brief.s0 = {
        ...brief.s0,
        campaignIntent: 'DIRECT_RESPONSE',
        clientName: 'Harbor Legal',
        vertical: 'LEADGEN_PROFESSIONAL',
        businessModel: 'HIGH_TICKET',
        backendDataAccess: 'partial',
      };
      brief.s1.leadGen = {
        contributionPerClose: 9000,
        pQualGivenLeadPct: 30,
        pApptGivenQualPct: 50,
        pCloseGivenApptPct: 20,
      };
      brief.s1.targets.requiredContributionAfterAds = 40;
      return brief;
    },
  },
  {
    id: 'stackflow',
    name: 'STACKFLOW — B2B SaaS',
    description: '$6,000 collected first-year contribution per closed deal.',
    lesson:
      'B2B: leads are cheap, pipeline is expensive. CRM → CAPI in §3 is mandatory for this vertical.',
    build: () => {
      const brief = emptyBrief();
      brief.s0 = {
        ...brief.s0,
        campaignIntent: 'DIRECT_RESPONSE',
        clientName: 'Stackflow',
        vertical: 'B2B_SAAS',
        businessModel: 'SUBSCRIPTION',
        backendDataAccess: 'full',
      };
      brief.s1.leadGen = {
        contributionPerClose: 6000,
        pQualGivenLeadPct: 35,
        pApptGivenQualPct: 45,
        pCloseGivenApptPct: 22,
      };
      brief.s1.targets.requiredContributionAfterAds = 30;
      brief.s1.ltv = {
        ...brief.s1.ltv,
        contributionPerMonth: 500,
        retention: { mode: 'churnPct', value: 2.5 },
        discountRateAnnualPct: 12,
        plannedMonthlySpend: 15000,
      };
      return brief;
    },
  },
];
