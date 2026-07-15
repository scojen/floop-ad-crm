/**
 * Server-side draft autosave: RHF watch subscription (non-rendering) →
 * hash-skip → 1.5s trailing debounce → PUT draft with the latest gate/calc
 * snapshots. Flushes on tab-hide and unmount. No localStorage, per spec.
 */
import { useEffect, useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useSaveBriefDraft } from '../api/queries';
import { GATE_ENGINE_VERSION } from '../lib/gates/types';
import type { BriefFormValues } from '../lib/schema/campaign-brief';
import type { Derivation } from '../components/planning/ComputedSidebar';

const DEBOUNCE_MS = 1500;

export type AutosaveState =
  | { kind: 'idle' }
  | { kind: 'dirty' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: string }
  | { kind: 'error'; message: string };

export function useBriefAutosave(
  briefId: string,
  form: UseFormReturn<BriefFormValues>,
  derivationRef: React.MutableRefObject<Derivation | null>,
  enabled: boolean,
): AutosaveState {
  const saveDraft = useSaveBriefDraft(briefId);
  const [state, setState] = useState<AutosaveState>({ kind: 'idle' });
  const lastSavedHash = useRef<string>('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep the latest mutate in a ref so the watch subscription stays stable.
  const mutateRef = useRef(saveDraft.mutate);
  mutateRef.current = saveDraft.mutate;

  useEffect(() => {
    if (!enabled) return;

    const buildBody = () => {
      const values = form.getValues();
      const derivation = derivationRef.current;
      return {
        payload: values,
        gateSnapshot: derivation?.gates,
        calcSnapshot: derivation
          ? (JSON.parse(JSON.stringify(derivation.calc)) as Record<string, unknown>)
          : undefined,
        acknowledgments: values.acknowledgments,
        overrides: values.overrides,
        gateEngineVersion: GATE_ENGINE_VERSION,
      };
    };

    const save = () => {
      const body = buildBody();
      const hash = JSON.stringify(body.payload);
      if (hash === lastSavedHash.current) return;
      setState({ kind: 'saving' });
      mutateRef.current(body, {
        onSuccess: (data) => {
          lastSavedHash.current = hash;
          setState({ kind: 'saved', at: data.updatedAt });
        },
        onError: (error) =>
          setState({ kind: 'error', message: error.message }),
      });
    };

    const subscription = form.watch(() => {
      setState((current) =>
        current.kind === 'saving' ? current : { kind: 'dirty' },
      );
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(save, DEBOUNCE_MS);
    });

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (timer.current) clearTimeout(timer.current);
        save();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
      if (timer.current) clearTimeout(timer.current);
      // Flush pending edits on unmount/navigation.
      save();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [briefId, enabled]);

  return state;
}
