import { NavLink, Outlet } from 'react-router';
import { useCrmUsers } from '../api/queries';
import { RepPicker } from '../components/shared/RepPicker';
import { useActor } from '../hooks/useActor';
import { initials } from '../lib/initials';

interface NavItem {
  to: string;
  label: string;
  /** Phase in which the screen ships; rendered as a "soon" hint until then. */
  soon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/campaigns', label: 'Campaigns' },
  { to: '/inbox', label: 'Inbox' },
  { to: '/pipeline', label: 'Pipeline' },
  { to: '/my-day', label: 'My Day', soon: true },
  { to: '/reports', label: 'Reports', soon: true },
  { to: '/automations', label: 'Automations', soon: true },
  { to: '/connections', label: 'Connections' },
];

export function AppShell() {
  const { actorId, clearActor } = useActor();
  const { data: usersData } = useCrmUsers();

  if (!actorId) {
    return <RepPicker />;
  }

  const actor = usersData?.users.find((user) => user.id === actorId);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-48 shrink-0 flex-col border-r border-neutral-200 bg-white px-3 py-4">
        <h1 className="px-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Floop Ad CRM
        </h1>
        <nav className="mt-4 flex-1 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-neutral-100 font-semibold text-neutral-900'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                }`
              }
            >
              <span>{item.label}</span>
              {item.soon && (
                <span className="text-[10px] uppercase text-neutral-300">
                  soon
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={clearActor}
          title="Switch rep"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-neutral-600 transition-colors hover:bg-neutral-50"
        >
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white"
            style={{ backgroundColor: actor?.avatarColor ?? '#6b7280' }}
          >
            {actor ? initials(actor.displayName) : '?'}
          </span>
          <span className="truncate">{actor?.displayName ?? 'Unknown'}</span>
        </button>
      </aside>

      <main className="flex-1 overflow-auto px-6 py-5">
        <Outlet />
      </main>
    </div>
  );
}
