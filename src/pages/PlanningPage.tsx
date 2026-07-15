import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { clientPath, putJson } from '../api/crmClient';
import {
  useCreateBrief,
  useDeleteBrief,
  usePlanningBriefs,
} from '../api/queries';
import { ARCHETYPES } from '../lib/archetypes';
import { timeAgo } from '../lib/time';

/** Brief list — every campaign starts here, not in Ads Manager. */
export function PlanningPage() {
  const briefs = usePlanningBriefs();
  const createBrief = useCreateBrief();
  const deleteBrief = useDeleteBrief();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [archetypeId, setArchetypeId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = () => {
    const archetype = ARCHETYPES.find((entry) => entry.id === archetypeId);
    const trimmed = name.trim() || archetype?.name.split('—')[0].trim() || '';
    if (!trimmed) return;
    setError(null);
    createBrief.mutate(
      { name: trimmed },
      {
        onSuccess: async (brief) => {
          if (archetype) {
            // Seed the draft with the archetype's payload before opening.
            try {
              await putJson(clientPath(`/planning/briefs/${brief.id}/draft`), {
                payload: archetype.build(),
              });
            } catch {
              // Non-fatal — the editor opens on an empty draft instead.
            }
          }
          navigate(`/planning/${brief.id}`);
        },
        onError: (mutationError) => setError(mutationError.message),
      },
    );
  };

  const selectedArchetype = ARCHETYPES.find(
    (entry) => entry.id === archetypeId,
  );

  return (
    <div>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            Campaign Planning
          </h2>
          <p className="text-sm text-neutral-500">
            Pre-flight briefs. This form can — and will — tell you not to run a
            campaign.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating((value) => !value)}
          className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          {creating ? 'Cancel' : '+ New brief'}
        </button>
      </header>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {creating && (
        <div className="mb-4 space-y-2 rounded-lg border border-neutral-300 bg-white p-3">
          <div className="flex flex-wrap gap-2">
            <input
              autoFocus
              placeholder="Brief name — e.g. Vellum Summer Launch"
              className="min-w-48 flex-1 rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-500"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && create()}
            />
            <select
              className="rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-500"
              value={archetypeId}
              onChange={(event) => setArchetypeId(event.target.value)}
              title="Start from a playbook archetype"
            >
              <option value="">Blank brief</option>
              {ARCHETYPES.map((archetype) => (
                <option key={archetype.id} value={archetype.id}>
                  {archetype.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={
                (!name.trim() && !archetypeId) || createBrief.isPending
              }
              onClick={create}
              className="rounded-md bg-neutral-800 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            >
              Create
            </button>
          </div>
          {selectedArchetype && (
            <p className="text-xs text-neutral-500">
              <span className="font-medium text-neutral-700">
                {selectedArchetype.description}
              </span>{' '}
              {selectedArchetype.lesson}
            </p>
          )}
        </div>
      )}

      <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
        {briefs.isLoading && (
          <p className="px-4 py-8 text-center text-sm text-neutral-400">
            Loading briefs…
          </p>
        )}
        {briefs.data?.briefs.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">
            No briefs yet. Every campaign should start with one.
          </p>
        )}
        {briefs.data?.briefs.map((brief) => (
          <div
            key={brief.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50"
          >
            <Link
              to={`/planning/${brief.id}`}
              className="min-w-0 flex-1"
            >
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-neutral-900">
                  {brief.name}
                </span>
                <StatusPill status={brief.status} />
              </span>
              <span className="mt-0.5 flex items-center gap-3 text-xs text-neutral-400">
                {brief.blockingCount > 0 && (
                  <span className="text-red-600">🔴 {brief.blockingCount}</span>
                )}
                {brief.warningCount > 0 && (
                  <span className="text-amber-600">🟡 {brief.warningCount}</span>
                )}
                {brief.overrideCount > 0 && (
                  <span>{brief.overrideCount} override(s)</span>
                )}
                <span>
                  edited {timeAgo(brief.updatedAt)} ago
                  {brief.updatedByName ? ` by ${brief.updatedByName}` : ''}
                </span>
              </span>
            </Link>
            {brief.status === 'DRAFT' && (
              <button
                type="button"
                title="Delete draft"
                onClick={() => {
                  if (confirm(`Delete draft "${brief.name}"?`)) {
                    deleteBrief.mutate({ briefId: brief.id });
                  }
                }}
                className="shrink-0 rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-400 hover:border-red-300 hover:text-red-600"
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: 'DRAFT' | 'SUBMITTED' }) {
  return status === 'SUBMITTED' ? (
    <span className="rounded-full border border-green-600 px-2 py-0.5 text-[10px] font-medium text-green-700">
      submitted
    </span>
  ) : (
    <span className="rounded-full border border-neutral-300 px-2 py-0.5 text-[10px] text-neutral-500">
      draft
    </span>
  );
}
