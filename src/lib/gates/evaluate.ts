/**
 * Gate evaluation + the submit decision. Pure and deterministic:
 * the sidebar renders `evaluateGates`, autosave snapshots it, and the
 * submit button consults `canSubmit`.
 */
import type { BriefFormValues } from '../schema/campaign-brief';
import type { DerivedCalcs } from '../calc/derive';
import { GATE_COPY } from './copy';
import { GATE_DEFINITIONS } from './definitions';
import type { GateResult } from './types';

const LEVEL_ORDER = { BLOCKING: 0, WARNING: 1, INFO: 2 } as const;

export function evaluateGates(
  brief: BriefFormValues,
  calc: DerivedCalcs,
): GateResult[] {
  const results: GateResult[] = [];
  for (const definition of GATE_DEFINITIONS) {
    const hit = definition.evaluate({ brief, calc });
    if (!hit) continue;
    const copy = GATE_COPY[definition.id];
    results.push({
      id: definition.id,
      section: definition.section,
      level: definition.level,
      title: copy?.title ?? definition.id,
      message: copy?.body(hit.meta ?? {}) ?? '',
      playbookRef: copy?.playbookRef ?? '',
      overridable: definition.overridable,
      requiresAcknowledgment: definition.level === 'WARNING',
      requiresOverride: definition.level === 'BLOCKING',
      fieldsSatisfied: hit.fieldsSatisfied,
      meta: hit.meta,
    });
  }
  return results.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}

export interface SubmitCheck {
  ok: boolean;
  /** Gates still standing in the way, with the reason. */
  unresolved: { gate: GateResult; reason: string }[];
}

const MIN_JUSTIFICATION_CHARS = 30;

export function canSubmit(
  results: GateResult[],
  acknowledgments: BriefFormValues['acknowledgments'],
  overrides: BriefFormValues['overrides'],
): SubmitCheck {
  const unresolved: SubmitCheck['unresolved'] = [];

  for (const gate of results) {
    if (gate.level === 'BLOCKING') {
      if (!gate.overridable) {
        unresolved.push({
          gate,
          reason: 'This gate cannot be overridden. Fix the underlying issue.',
        });
        continue;
      }
      const override = overrides[gate.id];
      if (!override) {
        unresolved.push({ gate, reason: 'Requires a written override.' });
      } else if (
        override.justification.trim().length < MIN_JUSTIFICATION_CHARS
      ) {
        unresolved.push({
          gate,
          reason: `Override justification must be at least ${MIN_JUSTIFICATION_CHARS} characters.`,
        });
      }
      continue;
    }
    if (gate.level === 'WARNING') {
      if (!acknowledgments[gate.id]) {
        unresolved.push({ gate, reason: 'Requires acknowledgment.' });
      }
      if (gate.fieldsSatisfied === false) {
        unresolved.push({
          gate,
          reason: 'Requires the companion fields (decision window, disclosure).',
        });
      }
    }
    // INFO never blocks.
  }
  return { ok: unresolved.length === 0, unresolved };
}

/** Drop acks/overrides whose gate no longer fires (called at submit only). */
export function pruneStale(
  results: GateResult[],
  acknowledgments: BriefFormValues['acknowledgments'],
  overrides: BriefFormValues['overrides'],
): {
  acknowledgments: BriefFormValues['acknowledgments'];
  overrides: BriefFormValues['overrides'];
} {
  const active = new Set(results.map((gate) => gate.id));
  return {
    acknowledgments: Object.fromEntries(
      Object.entries(acknowledgments).filter(([id]) => active.has(id)),
    ),
    overrides: Object.fromEntries(
      Object.entries(overrides).filter(([id]) => active.has(id)),
    ),
  };
}
