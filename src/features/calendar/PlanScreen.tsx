import { useState } from 'react';
import { useNavigate } from 'react-router';
import Icon from '../../components/Icon';
import { BackButton, btn, card, PageHeader } from '../../components/ui';
import { plannedWeekdays } from '../../domain/calendar';
import { today } from '../../domain/dates';
import { useDbQuery } from '../../hooks/useDbQuery';
import { getPlanVersions, savePlan } from '../../repositories/plan';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function PlanScreen() {
  const current = useDbQuery(async () => plannedWeekdays(await getPlanVersions(), today()), []);
  return current ? <PlanForm initial={current} /> : null;
}

function PlanForm({ initial }: { initial: number[] }) {
  const navigate = useNavigate();
  const [days, setDays] = useState(new Set(initial));

  const toggle = (d: number) =>
    setDays((s) => {
      const n = new Set(s);
      if (!n.delete(d)) n.add(d);
      return n;
    });

  return (
    <div className="flex flex-col gap-4">
      <BackButton />
      <PageHeader title="Weekly plan" subtitle={`${days.size} training day${days.size === 1 ? '' : 's'} per week`} />
      <p className="-mt-2 px-1 text-sm text-neutral-400">
        Changes apply from today; past days keep the old plan.
      </p>
      <div className={`${card} divide-y divide-white/[0.06] overflow-hidden`}>
        {WEEKDAYS.map((name, i) => {
          const on = days.has(i + 1);
          return (
            <button key={name} className="flex w-full items-center gap-3 px-4 py-3.5 active:bg-neutral-800" onClick={() => toggle(i + 1)}>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                  on ? 'bg-green-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {name.slice(0, 2)}
              </span>
              <span className={`flex-1 text-left ${on ? 'font-semibold' : 'text-neutral-300'}`}>{name}</span>
              {on && <Icon name="check" className="h-6 w-6 text-green-500" />}
            </button>
          );
        })}
      </div>
      <button
        className={btn.primary}
        onClick={async () => {
          await savePlan(today(), [...days].sort());
          navigate(-1);
        }}
      >
        <Icon name="save" />
        Save plan
      </button>
    </div>
  );
}
