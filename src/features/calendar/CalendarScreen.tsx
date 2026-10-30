import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import Icon from '../../components/Icon';
import Sheet from '../../components/Sheet';
import { btn, card, PageHeader, SectionTitle } from '../../components/ui';
import { monthGrid, type DayStatus } from '../../domain/calendar';
import { RATING_COLOR } from '../../domain/checkIn';
import { today, toLocalDate } from '../../domain/dates';
import { SKIP_REASON_NAMES, type SkipReason } from '../../repositories/skips';
import { logPastWorkout } from '../../repositories/workouts';
import { formatDate } from '../history/HistoryScreen';
import SkipSheet from './SkipSheet';
import { useDays, type DayInfo } from './useDays';

export const STATUS_STYLE: Record<DayStatus, string> = {
  done: 'bg-green-500 text-neutral-950',
  extra: 'bg-green-500/60 text-neutral-950',
  skipped: 'bg-amber-500/20 text-amber-300',
  missed: 'bg-red-500/20 text-red-300',
  planned: 'ring-2 ring-inset ring-green-500/70 text-neutral-100',
  rest: 'bg-neutral-800/50 text-neutral-400',
};

export const STATUS_NAME: Record<DayStatus, string> = {
  done: 'Done',
  extra: 'Done (extra)',
  skipped: 'Skipped',
  missed: 'Missed',
  planned: 'Planned',
  rest: 'Rest day',
};

const LEGEND: DayStatus[] = ['done', 'extra', 'planned', 'skipped', 'missed'];

/** Done and skipped days get a soft tint and a corner badge; the other statuses keep their fill. */
const isMarked = (s: DayStatus) => s === 'done' || s === 'extra' || s === 'skipped';
const MARKED_CELL: Partial<Record<DayStatus, string>> = {
  done: 'bg-green-500/10 ring-1 ring-inset ring-green-500/30',
  extra: 'bg-green-500/10 ring-1 ring-inset ring-green-500/30',
  skipped: 'bg-amber-500/10 ring-1 ring-inset ring-amber-500/30',
};

/** Tick (done), outlined tick (done, unplanned) or dash (skipped) in a small circle; dots for the rest. */
function StatusMark({ status, size = 'h-4 w-4' }: { status: DayStatus; size?: string }) {
  if (status === 'skipped') {
    return (
      <span className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-amber-500`}>
        <span className="h-0.5 w-1/2 rounded-full bg-neutral-950" />
      </span>
    );
  }
  if (status === 'done' || status === 'extra') {
    return (
      <span
        className={`flex ${size} shrink-0 items-center justify-center rounded-full ${
          status === 'done' ? 'bg-green-500 text-neutral-950' : 'text-green-500 ring-[1.5px] ring-inset ring-green-500'
        }`}
      >
        <Icon name="check" className="h-full w-full p-px" />
      </span>
    );
  }
  return <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_STYLE[status]}`} />;
}

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

  const shift = (n: number) =>
    setMonth(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }));

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
      <PageHeader
        title="Calendar"
        action={
          <Link to="/plan" className={`${btn.secondary} py-2 text-sm`}>
            <Icon name="plan" className="h-[18px] w-[18px]" />
            Weekly plan
          </Link>
        }
      />

      <section className={`${card} p-3`}>
        <div className="mb-3 flex items-center justify-between">
          <button className={btn.icon} onClick={() => shift(-1)} aria-label="Previous month">
            <Icon name="back" />
          </button>
          <span className="font-semibold">
            {new Date(month.y, month.m).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </span>
          <button className={btn.icon} onClick={() => shift(1)} aria-label="Next month">
            <Icon name="chevronRight" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i} className="pb-1 text-[11px] font-semibold text-neutral-500">
              {d}
            </span>
          ))}
          {cells.map((date, i) => {
            const d = date ? byDate.get(date) : undefined;
            return date ? (
              <button
                key={date}
                className={`relative aspect-square rounded-xl text-sm font-medium ${
                  d ? (isMarked(d.status) ? MARKED_CELL[d.status] : STATUS_STYLE[d.status]) : ''
                } ${date === t ? 'font-bold outline-2 outline-offset-1 outline-white' : ''}`}
                onClick={() => setOpen(date)}
              >
                {d?.mood && (
                  <span
                    className="absolute left-1/2 top-1 h-2 w-2 -translate-x-1/2 rounded-full"
                    style={{ background: RATING_COLOR[d.mood] }}
                  />
                )}
                {Number(date.slice(8))}
                {d && isMarked(d.status) && (
                  <span className="absolute bottom-1 right-1">
                    <StatusMark status={d.status} size="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            ) : (
              <span key={`pad${i}`} />
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-400">
          {LEGEND.map((s) => (
            <span key={s} className="flex items-center gap-1">
              <StatusMark status={s} />
              {STATUS_NAME[s]}
            </span>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <SectionTitle>This month</SectionTitle>
        <div className={`${card} p-4`}>
          <div className="grid grid-cols-4 gap-2 text-center">
            <Count label="Planned" value={days?.filter((d) => d.planned).length ?? 0} />
            <Count label="Done" value={count('done', 'extra')} accent="text-green-500" />
            <Count label="Skipped" value={count('skipped')} accent="text-amber-300" />
            <Count label="Missed" value={count('missed')} accent="text-red-300" />
          </div>
          {reasons.size > 0 && (
            <ul className="mt-4 flex flex-col gap-1.5 border-t border-white/[0.06] pt-3 text-sm text-neutral-300">
              {[...reasons].map(([r, n]) => (
                <li key={r} className="flex justify-between">
                  <span>{SKIP_REASON_NAMES[r]}</span>
                  <span className="text-neutral-400">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {open && byDate.get(open) && <DaySheet day={byDate.get(open)!} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Count({ label, value, accent = '' }: { label: string; value: number; accent?: string }) {
  return (
    <div>
      <div className={`text-2xl font-bold ${accent}`}>{value}</div>
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
        <p className="flex items-center gap-2 text-neutral-400">
          <StatusMark status={day.status} />
          {STATUS_NAME[day.status]}
          {day.skip && ` · ${SKIP_REASON_NAMES[day.skip.reason]}${day.skip.note ? ` — ${day.skip.note}` : ''}`}
        </p>
        {day.workouts.map((w) => (
          <div key={w.id} className="flex flex-col gap-1.5">
            <Link to={`/history/${w.id}`} className={`${btn.secondary} justify-start`}>
              <Icon name="dumbbell" className="h-5 w-5 text-green-500" />
              <span className="flex-1 text-left">{w.title}</span>
              <Icon name="chevronRight" className="h-5 w-5 text-neutral-500" />
            </Link>
            {w.notes.length > 0 && (
              <ul className="flex flex-col gap-1 px-1 text-sm text-neutral-400">
                {w.notes.map((n, i) => (
                  <li key={i}>
                    <span className="font-medium text-neutral-200">{n.name}:</span> {n.note}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {day.workouts.length === 0 && (
          <button className={`${btn.secondary} justify-start`} onClick={() => setSkipping(true)}>
            <Icon name="skipDay" className="h-5 w-5 text-amber-300" />
            {day.skip ? 'Edit skip reason' : 'Mark as skipped'}
          </button>
        )}
        {day.date < t && (
          <button className={`${btn.secondary} justify-start`} onClick={logPast}>
            <Icon name="add" className="h-5 w-5 text-green-500" />
            Log a workout for this day
          </button>
        )}
        {day.date === t && (
          <Link to="/" className={`${btn.secondary} justify-start`}>
            <Icon name="play" className="h-5 w-5 text-green-500" />
            Go to Today to start a workout
          </Link>
        )}
      </div>
    </Sheet>
  );
}
