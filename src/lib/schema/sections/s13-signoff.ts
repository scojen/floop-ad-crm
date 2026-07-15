import { z } from 'zod';
import { isoDate } from '../primitives';

/** S13 — Sign-off. The overrides log renders alongside and exports with the brief. */
export const s13Schema = z.object({
  mediaLead: z.object({ name: z.string(), date: isoDate }),
  /** Optional per engagement. */
  clientApproval: z.object({ name: z.string(), date: isoDate }),
});
export type S13Values = z.infer<typeof s13Schema>;

export const emptyS13 = (): S13Values => ({
  mediaLead: { name: '', date: null },
  clientApproval: { name: '', date: null },
});
