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
    <nav className="pointer-events-auto mx-auto flex w-full max-w-md gap-1 rounded-full bg-neutral-900/90 p-1.5 shadow-2xl shadow-black/60 ring-1 ring-white/10 backdrop-blur-xl">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-[11px] font-medium transition-colors ${
              isActive ? 'bg-green-500/15 text-green-500' : 'text-neutral-500 active:bg-white/5'
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
