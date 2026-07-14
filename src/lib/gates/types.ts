import type { DerivedCalcs } from '../calc/derive';
import type { BriefFormValues } from '../schema/campaign-brief';

/** Bump when gate logic changes — stamped into every stored snapshot. */
export const GATE_ENGINE_VERSION = 'gates-v1';

export type GateLevel = 'BLOCKING' | 'WARNING' | 'INFO';

export type SectionId = 's0' | 's1' | 's2' | 's3' | 's4';

export interface GateContext {
  brief: BriefFormValues;
  calc: DerivedCalcs;
}

/**
 * A declarative gate. `evaluate` returns interpolation values when the gate
 * is triggered, null when it is not. `fieldsSatisfied` lets a WARNING demand
 * companion fields (e.g. decision window) beyond the acknowledgment.
 */
export interface GateDefinition {
  id: string;
  section: SectionId;
  level: GateLevel;
  /** false = no override possible, ever (privacy). */
  overridable: boolean;
  evaluate(ctx: GateContext): GateHit | null;
}

export interface GateHit {
  meta?: Record<string, string | number>;
  /** For gates that require companion fields; undefined = not applicable. */
  fieldsSatisfied?: boolean;
}

export interface GateResult {
  id: string;
  section: SectionId;
  level: GateLevel;
  title: string;
  message: string;
  playbookRef: string;
  overridable: boolean;
  requiresAcknowledgment: boolean;
  requiresOverride: boolean;
  fieldsSatisfied?: boolean;
  meta?: Record<string, string | number>;
}
