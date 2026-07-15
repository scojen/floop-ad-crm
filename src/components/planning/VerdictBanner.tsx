/**
 * Verdict-first: the form's entire premise ("this form can tell you not to
 * run this campaign") promoted to the headline. Four states derived from
 * economics validity + gate resolution. Self-subscribing (own derivation)
 * so it live-updates without re-rendering the page shell.
 */
import { useFormContext, useWatch } from 'react-hook-form';
import type { BriefFormValues } from '../../lib/schema/campaign-brief';
import { useLiveDerivation } from './useLiveDerivation';

type Verdict = 'INCOMPLETE' | 'DO_NOT_RUN' | 'RUNS_WITH_RISKS' | 'CAN_RUN';

export function VerdictBanner() {
  const { control } = useFormContext<BriefFormValues>();
  const acknowledgments =
    useWatch({ control, name: 'acknowledgments' }) ?? {};
  const overrides = useWatch({ control, name: 'overrides' }) ?? {};
  const derivation = useLiveDerivation();
  const { calc, gates } = derivation;

  const blocking = gates.filter((g) => g.level === 'BLOCKING');
  const warnings = gates.filter((g) => g.level === 'WARNING');
  const unresolvedBlocking = blocking.filter(
    (g) => !g.overridable || !overrides[g.id],
  );
  const overriddenCount = blocking.length - unresolvedBlocking.length;
  const unackedWarnings = warnings.filter((g) => !acknowledgments[g.id]);

  let verdict: Verdict;
  if (unresolvedBlocking.length > 0) verdict = 'DO_NOT_RUN';
  else if (!calc.economicsValid) verdict = 'INCOMPLETE';
  else if (blocking.length > 0 || warnings.length > 0)
    verdict = 'RUNS_WITH_RISKS';
  else verdict = 'CAN_RUN';

  const config: Record<
    Verdict,
    { icon: string; title: string; detail: string; cls: string }
  > = {
    INCOMPLETE: {
      icon: '⚪',
      title: 'Incomplete — keep going',
      detail:
        'The unit economics (§1) aren’t fully entered yet, so the form can’t judge this campaign either way.',
      cls: 'border-neutral-300 bg-neutral-50 text-neutral-600',
    },
    DO_NOT_RUN: {
      icon: '🔴',
      title: `Do not run this campaign — ${unresolvedBlocking.length} blocking issue${unresolvedBlocking.length === 1 ? '' : 's'}`,
      detail: unresolvedBlocking
        .slice(0, 3)
        .map((g) => g.title)
        .join(' · '),
      cls: 'border-red-300 bg-red-50 text-red-800',
    },
    RUNS_WITH_RISKS: {
      icon: '🟠',
      title: `Can run — with ${overriddenCount > 0 ? `${overriddenCount} override${overriddenCount === 1 ? '' : 's'}` : ''}${overriddenCount > 0 && warnings.length > 0 ? ' and ' : ''}${warnings.length > 0 ? `${warnings.length} acknowledged risk${warnings.length === 1 ? '' : 's'}` : ''}`,
      detail:
        unackedWarnings.length > 0
          ? `${unackedWarnings.length} warning(s) still need acknowledgment before submit.`
          : 'Every risk is on the record and will be exported with the brief.',
      cls: 'border-amber-300 bg-amber-50 text-amber-800',
    },
    CAN_RUN: {
      icon: '✅',
      title: 'This campaign can run',
      detail:
        'Economics clear, measurement checks answered, no gate has an objection.',
      cls: 'border-green-300 bg-green-50 text-green-800',
    },
  };

  const { icon, title, detail, cls } = config[verdict];
  return (
    <div className={`mb-4 rounded-lg border px-4 py-3 ${cls}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span>{icon}</span>
        {title}
      </div>
      {detail && <p className="mt-0.5 text-xs opacity-90">{detail}</p>}
    </div>
  );
}
