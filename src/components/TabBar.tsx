import { NavLink } from 'react-router';
import Icon, { type IconName } from './Icon';

const tabs: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Today', icon: 'today' },
  { to: '/history', label: 'History', icon: 'history' },
  { to: '/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/exercises', label: 'Exercises', icon: 'dumbbell' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export default function TabBar() {
  return (
    <nav className="grid shrink-0 grid-cols-5 border-t border-white/[0.06] bg-neutral-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium ${
              isActive ? 'text-green-500' : 'text-neutral-500'
            }`
          }
        >
          <Icon name={t.icon} className="h-6 w-6" />
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
