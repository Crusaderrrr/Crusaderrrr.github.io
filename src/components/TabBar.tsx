import { NavLink } from 'react-router';

const tabs = [
  { to: '/', label: 'Today' },
  { to: '/history', label: 'History' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/exercises', label: 'Exercises' },
  { to: '/settings', label: 'Settings' },
];

export default function TabBar() {
  return (
    <nav className="grid grid-cols-5 border-t border-neutral-800 bg-neutral-900 pb-[env(safe-area-inset-bottom)]">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end
          className={({ isActive }) =>
            `py-3 text-center text-xs font-medium ${isActive ? 'text-green-500' : 'text-neutral-400'}`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
