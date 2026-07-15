import { useDeferredValue, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { deriveCalcs, type DerivedCalcs } from '../../lib/calc/derive';
import { evaluateGates } from '../../lib/gates/evaluate';
import type { GateResult } from '../../lib/gates/types';
import {
  briefFormSchema,
  type BriefFormValues,
} from '../../lib/schema/campaign-brief';

export interface Derivation {
  calc: DerivedCalcs;
  gates: GateResult[];
}

/**
 * Live whole-form derivation. Deliberately confined to leaf subtrees
 * (sidebar, verdict banner) so per-keystroke recomputes never re-render
 * the page shell. Cheap: pure arithmetic over ~100 fields.
 */
export function useLiveDerivation(): Derivation {
  const { control } = useFormContext<BriefFormValues>();
  const watched = useWatch({ control });
  const deferred = useDeferredValue(watched);

  return useMemo<Derivation>(() => {
    // useWatch returns a DeepPartial view; normalize through the schema so
    // the calc engine always sees a complete shape.
    const parsed = briefFormSchema.safeParse(deferred);
    const values = parsed.success
      ? parsed.data
      : (deferred as unknown as BriefFormValues);
    const calc = deriveCalcs(values);
    return { calc, gates: evaluateGates(values, calc) };
  }, [deferred]);
}
