import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { btn } from '../../components/Sheet';
import { addDays, parseLocalDate, today } from '../../domain/dates';
import { useDbQuery } from '../../hooks/useDbQuery';
import { SKIP_REASON_NAMES } from '../../repositories/skips';
import { getActiveWorkout, hasFinishedWorkouts, startWorkout } from '../../repositories/workouts';
import { STATUS_NAME } from '../calendar/CalendarScreen';
import SkipSheet from '../calendar/SkipSheet';
import { useDays, type DayInfo } from '../calendar/useDays';
import { formatDate } from '../history/HistoryScreen';
import { backupOverdue } from '../settings/backup';

// ponytail: missed days older than this aren't nagged about; they still show on the Calendar.
const MISSED_LOOKBACK_DAYS = 14;

export default function TodayScreen() {
  const navigate = useNavigate();
  const t = today();
  const days = useDays(addDays(t, -MISSED_LOOKBACK_DAYS), t);
  const active = useDbQuery(getActiveWorkout, []);
  const hasHistory = useDbQuery(hasFinishedWorkouts, []);
  const [showMissed, setShowMissed] = useState(false);
  const [skipDay, setSkipDay] = useState<DayInfo | null>(null);

  const todayInfo = days?.at(-1);
  const missed = days?.filter((d) => d.status === 'missed') ?? [];

  const start = async () => {
    if (todayInfo?.skip && !confirm('Today is marked as skipped. Start a workout and remove the skip?')) return;
    await startWorkout();
    navigate('/workout');
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-neutral-400">
          {parseLocalDate(t).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {todayInfo && (
        <section className="rounded-2xl bg-neutral-900 p-4">
          <p className="text-sm text-neutral-400">Status</p>
          <p className="text-lg font-semibold">
            {todayInfo.status === 'planned' ? 'Training day' : STATUS_NAME[todayInfo.status]}
            {todayInfo.skip && ` · ${SKIP_REASON_NAMES[todayInfo.skip.reason]}`}
          </p>
          {todayInfo.workouts.map((w) => (
            <Link key={w.id} to={`/history/${w.id}`} className="mt-1 block text-green-500">
              🏋 {w.title}
            </Link>
          ))}
        </section>
      )}

      {active === undefined ? null : active ? (
        <Link to="/workout" className={`${btn.primary} text-center text-lg`}>
          Continue workout
        </Link>
      ) : (
        <button className={`${btn.primary} text-lg`} onClick={start}>
          Start workout
        </button>
      )}

      {missed.length > 0 && (
        <section className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
          <button className="w-full text-left font-medium text-red-300" onClick={() => setShowMissed(!showMissed)}>
            {missed.length} missed day{missed.length > 1 ? 's' : ''} — add a reason {showMissed ? '▴' : '▾'}
          </button>
          {showMissed && (
            <ul className="mt-2 divide-y divide-red-500/20">
              {missed.map((d) => (
                <li key={d.date}>
                  <button className="flex w-full justify-between py-2 text-left" onClick={() => setSkipDay(d)}>
                    <span>{formatDate(d.date)}</span>
                    <span className="text-sm text-red-300">Add reason ›</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {hasHistory && backupOverdue() && (
        <Link to="/settings" className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-300">
          No backup in the last 14 days — export one in Settings ›
        </Link>
      )}

      {skipDay && <SkipSheet date={skipDay.date} skip={skipDay.skip} onClose={() => setSkipDay(null)} />}
    </div>
  );
}
