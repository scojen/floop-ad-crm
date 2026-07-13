import { useCrmUsers } from '../../api/queries';
import { useActor } from '../../hooks/useActor';
import { initials } from '../../lib/initials';

/**
 * Full-screen "who are you" gate shown until a rep is selected. Selection
 * is attribution (claims, activities), not authentication.
 */
export function RepPicker() {
  const { data, isLoading, isError, error } = useCrmUsers();
  const { selectActor } = useActor();

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-neutral-900">
          Who's working?
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Claims and activity you log will be attributed to this rep.
        </p>

        <div className="mt-6 space-y-2">
          {isLoading && (
            <p className="text-sm text-neutral-400">Loading team…</p>
          )}
          {isError && (
            <p className="text-sm text-red-600">
              Couldn't load the team: {error.message}
            </p>
          )}
          {data?.users.length === 0 && (
            <p className="text-sm text-neutral-500">
              No reps seeded yet — run{' '}
              <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">
                npx ts-node scripts/seed-crm-users.ts
              </code>{' '}
              in ad-manager-api.
            </p>
          )}
          {data?.users.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => selectActor(user.id)}
              className="flex w-full items-center gap-3 rounded-md border border-neutral-200 px-4 py-3 text-left transition-colors hover:border-neutral-400 hover:bg-neutral-50"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: user.avatarColor ?? '#6b7280' }}
              >
                {initials(user.displayName)}
              </span>
              <span>
                <span className="block text-sm font-medium text-neutral-900">
                  {user.displayName}
                </span>
                {user.email && (
                  <span className="block text-xs text-neutral-500">
                    {user.email}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
