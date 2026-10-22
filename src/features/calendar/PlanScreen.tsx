import { useState } from 'react';
import { useNavigate } from 'react-router';
import { btn } from '../../components/Sheet';
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
      <button className="self-start text-green-500" onClick={() => navigate(-1)}>
        ‹ Back
      </button>
      <div>
        <h1 className="text-2xl font-bold">Weekly plan</h1>
        <p className="text-sm text-neutral-400">
          Pick your training days. Changes apply from today; past days keep the old plan.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {WEEKDAYS.map((name, i) => (
          <button
            key={name}
            className={`flex items-center justify-between rounded-xl px-4 py-3 ${
              days.has(i + 1) ? 'bg-green-600 font-semibold' : 'bg-neutral-900'
            }`}
            onClick={() => toggle(i + 1)}
          >
            {name}
            <span>{days.has(i + 1) ? '✓' : ''}</span>
          </button>
        ))}
      </div>
      <button
        className={btn.primary}
        onClick={async () => {
          await savePlan(today(), [...days].sort());
          navigate(-1);
        }}
      >
        Save plan
      </button>
    </div>
  );
}
