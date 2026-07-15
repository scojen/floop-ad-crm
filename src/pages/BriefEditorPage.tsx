import { useCallback, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useParams } from 'react-router';
import { usePlanningBrief, useSubmitBrief } from '../api/queries';
import {
  ComputedSidebar,
  type Derivation,
} from '../components/planning/ComputedSidebar';
import { LockedOverlay } from '../components/planning/LockedOverlay';
import { VerdictBanner } from '../components/planning/VerdictBanner';
import { Section0 } from '../components/planning/sections/Section0';
import { Section1 } from '../components/planning/sections/Section1';
import { Section2 } from '../components/planning/sections/Section2';
import { Section3 } from '../components/planning/sections/Section3';
import { Section4 } from '../components/planning/sections/Section4';
import { AutosaveLabel } from '../components/planning/AutosaveLabel';
import { useBriefAutosave } from '../hooks/useBriefAutosave';
import { canSubmit, pruneStale } from '../lib/gates/evaluate';
import { GATE_ENGINE_VERSION } from '../lib/gates/types';
import {
  briefFormSchema,
  migratePayload,
  type BriefFormValues,
} from '../lib/schema/campaign-brief';
import type { Brief } from '../types/planning';

export function BriefEditorPage() {
  const { briefId = '' } = useParams();
  const brief = usePlanningBrief(briefId);

  if (brief.isLoading) {
    return <p className="text-sm text-neutral-400">Loading brief…</p>;
  }
  if (brief.isError || !brief.data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Couldn't load this brief.{' '}
        <Link to="/planning" className="underline">
          Back to planning
        </Link>
      </div>
    );
  }
  if (brief.data.status === 'SUBMITTED') {
    return <SubmittedBriefView brief={brief.data} />;
  }
  return <Editor brief={brief.data} />;
}

function Editor({ brief }: { brief: Brief }) {
  const defaultValues = useMemo(
    () => migratePayload(brief.payload),
    [brief.payload],
  );
  const form = useForm<BriefFormValues>({
    defaultValues,
    // Cast bridges the resolvers-v5 / RHF dual-type identity quirk; the
    // runtime shape is identical (input === output now that the schema has
    // no .default()s).
    resolver: zodResolver(briefFormSchema) as unknown as Resolver<BriefFormValues>,
    mode: 'onBlur',
  });

  const derivationRef = useRef<Derivation | null>(null);
  const [economicsValid, setEconomicsValid] = useState(false);
  const onDerived = useCallback((derivation: Derivation) => {
    // setState only on flips — keystrokes don't re-render the page shell.
    setEconomicsValid((current) =>
      current === derivation.calc.economicsValid
        ? current
        : derivation.calc.economicsValid,
    );
  }, []);

  const autosave = useBriefAutosave(brief.id, form, derivationRef, true);
  const submitBrief = useSubmitBrief(brief.id);
  const [submitProblems, setSubmitProblems] = useState<string[]>([]);

  const onSubmit = () => {
    setSubmitProblems([]);
    const derivation = derivationRef.current;
    if (!derivation) return;
    const values = form.getValues();

    // 1) Gate resolution (overrides/acks) — the business "no".
    const pruned = pruneStale(
      derivation.gates,
      values.acknowledgments,
      values.overrides,
    );
    const gateCheck = canSubmit(
      derivation.gates,
      pruned.acknowledgments,
      pruned.overrides,
    );
    // 2) Completeness — the schema "missing fields".
    form.handleSubmit(
      () => undefined,
      () => undefined,
    );

    const problems: string[] = gateCheck.unresolved.map(
      (entry) => `${entry.gate.title}: ${entry.reason}`,
    );
    if (!gateCheck.ok) {
      setSubmitProblems(problems);
      return;
    }

    const body = {
      payload: { ...values, ...pruned },
      gateSnapshot: derivation.gates,
      calcSnapshot: JSON.parse(JSON.stringify(derivation.calc)) as Record<
        string,
        unknown
      >,
      acknowledgments: pruned.acknowledgments,
      overrides: pruned.overrides,
      gateEngineVersion: GATE_ENGINE_VERSION,
    };
    submitBrief.mutate(body, {
      onError: (error) => setSubmitProblems([error.message]),
    });
  };

  const blocking =
    derivationRef.current?.gates.filter((g) => g.level === 'BLOCKING') ?? [];

  return (
    <FormProvider {...form}>
      <div className="pb-16 lg:pb-0">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <Link
              to="/planning"
              className="text-xs text-neutral-400 hover:underline"
            >
              ← Planning
            </Link>
            <h2 className="text-lg font-semibold text-neutral-900">
              {brief.name}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <AutosaveLabel state={autosave} />
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitBrief.isPending}
              className={`rounded-md px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${
                blocking.length > 0
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-neutral-800 hover:bg-neutral-700'
              }`}
              title={
                blocking.length > 0
                  ? 'Blocking gates require overrides before submit'
                  : 'Submit the brief'
              }
            >
              {submitBrief.isPending
                ? 'Submitting…'
                : blocking.length > 0
                  ? `Submit (${blocking.length} 🔴)`
                  : 'Submit brief'}
            </button>
          </div>
        </header>

        <VerdictBanner />

        {submitProblems.length > 0 && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-semibold">The form says no — not yet:</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
              {submitProblems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-4">
            <Section0 />
            <Section1 calc={derivationRef.current?.calc ?? null} />
            <LockedOverlay locked={!economicsValid}>
              <div className="space-y-4">
                <Section2 calc={derivationRef.current?.calc ?? null} />
                <Section3 calc={derivationRef.current?.calc ?? null} />
                <Section4 calc={derivationRef.current?.calc ?? null} />
              </div>
            </LockedOverlay>
          </div>
          <ComputedSidebar derivationRef={derivationRef} onDerived={onDerived} />
        </div>
      </div>
    </FormProvider>
  );
}

function SubmittedBriefView({ brief }: { brief: Brief }) {
  const [tab, setTab] = useState<'markdown' | 'json'>('markdown');
  const briefJson = useMemo(
    () =>
      JSON.stringify(
        {
          meta: {
            briefId: brief.id,
            name: brief.name,
            submittedAt: brief.submittedAt,
            gateEngineVersion: brief.gateEngineVersion,
          },
          payload: brief.payload,
          calcSnapshot: brief.calcSnapshot,
          gateSnapshot: brief.gateSnapshot,
          overrides: brief.overrides,
          acknowledgments: brief.acknowledgments,
        },
        null,
        2,
      ),
    [brief],
  );

  const download = (content: string, filename: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <header className="mb-4">
        <Link to="/planning" className="text-xs text-neutral-400 hover:underline">
          ← Planning
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">
            {brief.name}
            <span className="ml-2 rounded-full border border-green-600 px-2 py-0.5 align-middle text-[10px] font-medium text-green-700">
              submitted
            </span>
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                download(
                  brief.artifactMarkdown ?? '',
                  `${brief.name}.md`,
                  'text/markdown',
                )
              }
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Download .md
            </button>
            <button
              type="button"
              onClick={() =>
                download(briefJson, `${brief.name}.json`, 'application/json')
              }
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Download .json
            </button>
          </div>
        </div>
        <p className="mt-0.5 text-xs text-neutral-400">
          Submitted {brief.submittedAt?.slice(0, 10)} · {brief.overrideCount}{' '}
          override(s) logged · briefs are immutable once submitted
        </p>
      </header>

      <div className="mb-2 flex gap-1.5">
        {(['markdown', 'json'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-md px-3 py-1 text-xs ${
              tab === value
                ? 'bg-neutral-800 font-medium text-white'
                : 'text-neutral-500 hover:bg-neutral-100'
            }`}
          >
            {value}
          </button>
        ))}
      </div>
      <pre className="overflow-x-auto rounded-lg border border-neutral-200 bg-white p-4 text-xs leading-relaxed text-neutral-800">
        {tab === 'markdown' ? (brief.artifactMarkdown ?? '') : briefJson}
      </pre>
    </div>
  );
}
