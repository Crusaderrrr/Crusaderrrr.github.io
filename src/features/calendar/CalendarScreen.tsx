import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import Sheet, { btn } from '../../components/Sheet';
import { monthGrid, type DayStatus } from '../../domain/calendar';
import { today, toLocalDate } from '../../domain/dates';
import { SKIP_REASON_NAMES, type SkipReason } from '../../repositories/skips';
import { logPastWorkout } from '../../repositories/workouts';
import { formatDate } from '../history/HistoryScreen';
import SkipSheet from './SkipSheet';
import { useDays, type DayInfo } from './useDays';

export const STATUS_STYLE: Record<DayStatus, string> = {
  done: 'bg-green-600 text-white',
  extra: 'bg-green-600 text-white',
  skipped: 'bg-amber-500/25 text-amber-300',
  missed: 'bg-red-500/25 text-red-300',
  planned: 'ring-1 ring-inset ring-green-600 text-neutral-100',
  rest: 'text-neutral-400',
};

export const STATUS_NAME: Record<DayStatus, string> = {
  done: 'Done',
  extra: 'Done (extra)',
  skipped: 'Skipped',
  missed: 'Missed',
  planned: 'Planned',
  rest: 'Rest',
};

export default function CalendarScreen() {
  const now = new Date();
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [open, setOpen] = useState<string | null>(null);
  const touchX = useRef<number | null>(null);

  const cells = monthGrid(month.y, month.m);
  const first = toLocalDate(new Date(month.y, month.m, 1));
  const last = toLocalDate(new Date(month.y, month.m + 1, 0));
  const days = useDays(first, last);
  const byDate = new Map(days?.map((d) => [d.date, d]));
  const t = today();

  const shift = (n: number) => setMonth(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }));

  const count = (...s: DayStatus[]) => days?.filter((d) => s.includes(d.status)).length ?? 0;
  const reasons = new Map<SkipReason, number>();
  days?.forEach((d) => d.skip && reasons.set(d.skip.reason, (reasons.get(d.skip.reason) ?? 0) + 1));

  return (
    <div
      className="flex flex-col gap-4"
      onTouchStart={(e) => (touchX.current = e.touches[0]!.clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0]!.clientX - (touchX.current ?? 0);
        if (Math.abs(dx) > 60) shift(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <Link to="/plan" className="text-green-500">
          Weekly plan
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <button className="px-3 py-1 text-2xl" onClick={() => shift(-1)} aria-label="Previous month">
          ‹
        </button>
        <span className="font-semibold">
          {new Date(month.y, month.m).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </span>
        <button className="px-3 py-1 text-2xl" onClick={() => shift(1)} aria-label="Next month">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="text-xs text-neutral-500">
            {d}
          </span>
        ))}
        {cells.map((date, i) => {
          const d = date ? byDate.get(date) : undefined;
          return date ? (
            <button
              key={date}
              className={`relative aspect-square rounded-lg text-sm ${d ? STATUS_STYLE[d.status] : ''} ${
                date === t ? 'font-bold outline-2 outline-white' : ''
              }`}
              onClick={() => setOpen(date)}
            >
              {Number(date.slice(8))}
              {d?.status === 'extra' && <span className="absolute top-0.5 right-1 text-[10px]">+</span>}
            </button>
          ) : (
            <span key={`pad${i}`} />
          );
        })}
      </div>

      <section className="rounded-2xl bg-neutral-900 p-4">
        <h2 className="mb-2 font-semibold">This month</h2>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Count label="Planned" value={days?.filter((d) => d.planned).length ?? 0} />
          <Count label="Done" value={count('done', 'extra')} />
          <Count label="Skipped" value={count('skipped')} />
          <Count label="Missed" value={count('missed')} />
        </div>
        {reasons.size > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-neutral-300">
            {[...reasons].map(([r, n]) => (
              <li key={r} className="flex justify-between">
                <span>{SKIP_REASON_NAMES[r]}</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {open && byDate.get(open) && <DaySheet day={byDate.get(open)!} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-neutral-400">{label}</div>
    </div>
  );
}

export function DaySheet({ day, onClose }: { day: DayInfo; onClose: () => void }) {
  const navigate = useNavigate();
  const [skipping, setSkipping] = useState(false);
  const t = today();

  if (skipping) return <SkipSheet date={day.date} skip={day.skip} onClose={onClose} />;

  const logPast = async () => {
    if (day.skip && !confirm('This day is marked as skipped. Log a workout and remove the skip?')) return;
    const id = await logPastWorkout(day.date);
    navigate(`/history/${id}/edit`);
  };

  return (
    <Sheet title={formatDate(day.date)} onClose={onClose}>
      <div className="flex flex-col gap-2 pb-2">
        <p className="text-neutral-400">
          {STATUS_NAME[day.status]}
          {day.skip && ` · ${SKIP_REASON_NAMES[day.skip.reason]}${day.skip.note ? ` — ${day.skip.note}` : ''}`}
        </p>
        {day.workouts.map((w) => (
          <Link key={w.id} to={`/history/${w.id}`} className={`${btn.secondary} text-left`}>
            🏋 {w.title}
          </Link>
        ))}
        {day.workouts.length === 0 && (
          <button className={`${btn.secondary} text-left`} onClick={() => setSkipping(true)}>
            {day.skip ? 'Edit skip reason' : 'Mark as skipped'}
          </button>
        )}
        {day.date < t && (
          <button className={`${btn.secondary} text-left`} onClick={logPast}>
            + Log a workout for this day
          </button>
        )}
        {day.date === t && (
          <Link to="/" className={`${btn.secondary} text-left`}>
            Go to Today to start a workout
          </Link>
        )}
      </div>
    </Sheet>
  );
}
