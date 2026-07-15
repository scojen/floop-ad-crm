import { NavLink, Outlet } from 'react-router';
import { useCrmUsers } from '../api/queries';
import { RepPicker } from '../components/shared/RepPicker';
import { useActor } from '../hooks/useActor';
import { initials } from '../lib/initials';

interface NavItem {
  to: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/campaigns', label: 'Campaigns' },
  { to: '/planning', label: 'Planning' },
  { to: '/inbox', label: 'Inbox' },
  { to: '/pipeline', label: 'Pipeline' },
  { to: '/my-day', label: 'My Day' },
  { to: '/reports', label: 'Reports' },
  { to: '/automations', label: 'Automations' },
  { to: '/connections', label: 'Connections' },
];

export function AppShell() {
  const { actorId, clearActor } = useActor();
  const { data: usersData } = useCrmUsers();

  if (!actorId) {
    return <RepPicker />;
  }

  const actor = usersData?.users.find((user) => user.id === actorId);
  const avatar = (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
      style={{ backgroundColor: actor?.avatarColor ?? '#6b7280' }}
    >
      {actor ? initials(actor.displayName) : '?'}
    </span>
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Mobile: sticky top bar with scrollable nav chips */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white md:hidden">
        <div className="flex items-center justify-between px-4 pt-2.5">
          <h1 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Floop Ad CRM
          </h1>
          <button
            type="button"
            onClick={clearActor}
            title="Switch rep"
            className="p-1"
          >
            {avatar}
          </button>
        </div>
        <nav className="flex gap-1.5 overflow-x-auto px-3 py-2 [scrollbar-width:none]">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'border-neutral-800 bg-neutral-800 font-medium text-white'
                    : 'border-neutral-200 text-neutral-600'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Desktop: left sidebar */}
      <aside className="hidden w-48 shrink-0 flex-col border-r border-neutral-200 bg-white px-3 py-4 md:flex">
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
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={clearActor}
          title="Switch rep"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-neutral-600 transition-colors hover:bg-neutral-50"
        >
          {avatar}
          <span className="truncate">{actor?.displayName ?? 'Unknown'}</span>
        </button>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto px-4 py-4 md:px-6 md:py-5">
        <Outlet />
      </main>
    </div>
  );
}
