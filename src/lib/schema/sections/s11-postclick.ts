import { z } from 'zod';
import { isoDate, nullableNumber, pct0to100 } from '../primitives';

/** S11 — Landing page & post-click. A form change that raises submissions
 *  but lowers appointments is not a win (§9). */
export const s11Schema = z.object({
  destinationUrls: z.string(),
  messageMatch: z.object({
    confirmed: z.boolean().nullable(),
    notes: z.string(),
  }),
  /** Mobile LCP, seconds. */
  lcpSecondsMobile: nullableNumber,
  checkoutTested: z.object({
    tested: z.boolean().nullable(),
    on: isoDate,
  }),
  inventoryConfirmed: z.boolean().nullable(),
  downstreamQualityMetric: z.string(),
  /** Intake capacity — lead gen / high-ticket only. */
  intake: z.object({
    medianFirstResponseMinutes: nullableNumber,
    p90FirstResponseMinutes: nullableNumber,
    capacityUtilizationPct: pct0to100,
  }),
});
export type S11Values = z.infer<typeof s11Schema>;

export const emptyS11 = (): S11Values => ({
  destinationUrls: '',
  messageMatch: { confirmed: null, notes: '' },
  lcpSecondsMobile: null,
  checkoutTested: { tested: null, on: null },
  inventoryConfirmed: null,
  downstreamQualityMetric: '',
  intake: {
    medianFirstResponseMinutes: null,
    p90FirstResponseMinutes: null,
    capacityUtilizationPct: null,
  },
});
