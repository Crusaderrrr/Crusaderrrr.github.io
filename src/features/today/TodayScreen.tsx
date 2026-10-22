import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import Icon from '../../components/Icon';
import { btn, card, PageHeader, SectionTitle, Stat } from '../../components/ui';
import { addDays, isoWeekday, parseLocalDate, today } from '../../domain/dates';
import { formatWeight } from '../../domain/sets';
import { formatDuration } from '../../domain/workout';
import { useDbQuery } from '../../hooks/useDbQuery';
import { SKIP_REASON_NAMES } from '../../repositories/skips';
import { getActiveWorkout, listHistory, startWorkout } from '../../repositories/workouts';
import { STATUS_NAME, STATUS_STYLE } from '../calendar/CalendarScreen';
import SkipSheet from '../calendar/SkipSheet';
import { useDays, type DayInfo } from '../calendar/useDays';
import { formatDate } from '../history/HistoryScreen';
import { backupOverdue } from '../settings/backup';

// ponytail: missed days older than this aren't nagged about; they still show on the Calendar.
const MISSED_LOOKBACK_DAYS = 14;

export default function TodayScreen() {
  const navigate = useNavigate();
  const t = today();
  const weekStart = addDays(t, 1 - isoWeekday(t));
  const days = useDays(addDays(t, -MISSED_LOOKBACK_DAYS), addDays(weekStart, 6));
  const active = useDbQuery(getActiveWorkout, []);
  const last = useDbQuery(async () => (await listHistory())[0] ?? null, []);
  const [showMissed, setShowMissed] = useState(false);
  const [skipDay, setSkipDay] = useState<DayInfo | null>(null);

  const todayInfo = days?.find((d) => d.date === t);
  const week = days?.filter((d) => d.date >= weekStart) ?? [];
  const missed = days?.filter((d) => d.status === 'missed') ?? [];
  const weekPlanned = week.filter((d) => d.planned).length;
  const weekDone = week.filter((d) => d.status === 'done' || d.status === 'extra').length;

  const start = async () => {
    if (todayInfo?.skip && !confirm('Today is marked as skipped. Start a workout and remove the skip?')) return;
    await startWorkout();
    navigate('/workout');
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Today"
        subtitle={parseLocalDate(t).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
      />

      <section className={`${card} flex flex-col gap-4 p-4`}>
        {todayInfo && (
          <div className="flex items-center gap-3">
            <span className={`flex h-11 w-11 items-center justify-center rounded-full ${STATUS_STYLE[todayInfo.status]}`}>
              <Icon name={todayInfo.status === 'skipped' ? 'skipDay' : todayInfo.workouts.length ? 'check' : 'dumbbell'} />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-semibold">
                {todayInfo.status === 'planned' ? 'Training day' : STATUS_NAME[todayInfo.status]}
              </p>
              <p className="text-sm text-neutral-400">
                {todayInfo.skip
                  ? SKIP_REASON_NAMES[todayInfo.skip.reason]
                  : todayInfo.workouts.length
                    ? todayInfo.workouts.map((w) => w.title).join(', ')
                    : todayInfo.planned
                      ? 'Trust the process.'
                      : 'No workout planned today'}
              </p>
            </div>
          </div>
        )}
        {active === undefined ? null : active ? (
          <Link to="/workout" className={`${btn.primary} text-lg`}>
            <Icon name="play" className="h-6 w-6" />
            Continue workout
          </Link>
        ) : (
          <button className={`${btn.primary} text-lg`} onClick={start}>
            <Icon name="play" className="h-6 w-6" />
            Start workout
          </button>
        )}
      </section>

      {missed.length > 0 && (
        <section className="rounded-2xl bg-red-500/10 ring-1 ring-red-500/30">
          <button
            className="flex w-full items-center gap-3 p-4 text-left font-medium text-red-300"
            onClick={() => setShowMissed(!showMissed)}
          >
            <Icon name="warning" />
            <span className="flex-1">
              {missed.length} missed day{missed.length > 1 ? 's' : ''} — add a reason
            </span>
            <Icon name={showMissed ? 'chevronUp' : 'chevronDown'} />
          </button>
          {showMissed && (
            <ul className="divide-y divide-red-500/20 border-t border-red-500/20 px-4">
              {missed.map((d) => (
                <li key={d.date}>
                  <button className="flex w-full items-center justify-between py-3 text-left" onClick={() => setSkipDay(d)}>
                    <span>{formatDate(d.date)}</span>
                    <span className="flex items-center text-sm text-red-300">
                      Add reason <Icon name="chevronRight" className="h-4 w-4" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <SectionTitle>This week</SectionTitle>
          {weekPlanned > 0 && (
            <span className="text-xs text-neutral-500">
              {weekDone} / {weekPlanned} planned done
            </span>
          )}
        </div>
        <Link to="/calendar" className={`${card} grid grid-cols-7 gap-1 p-3`}>
          {week.map((d) => (
            <div key={d.date} className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] font-medium text-neutral-500">
                {parseLocalDate(d.date).toLocaleDateString('en-GB', { weekday: 'narrow' })}
              </span>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${STATUS_STYLE[d.status]} ${
                  d.date === t ? 'outline-2 outline-offset-2 outline-white' : ''
                }`}
              >
                {Number(d.date.slice(8))}
              </span>
            </div>
          ))}
        </Link>
      </section>

      {last && (
        <section className="flex flex-col gap-2">
          <SectionTitle>Last workout</SectionTitle>
          <Link to={`/history/${last.id}`} className={`${card} flex flex-col gap-3 p-4 active:bg-neutral-800`}>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-semibold">{last.title}</span>
              <span className="shrink-0 text-sm text-neutral-400">{formatDate(last.date)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat icon="clock" label="Duration" value={formatDuration((Date.parse(last.finishedAt!) - Date.parse(last.startedAt)) / 1000)} />
              <Stat icon="weight" label="Volume" value={`${formatWeight(last.volume)} kg`} />
              <Stat icon="dumbbell" label="Exercises" value={String(last.exercises.length)} />
            </div>
          </Link>
        </section>
      )}

      {last && backupOverdue() && (
        <Link to="/settings" className="flex items-center gap-3 rounded-2xl bg-amber-500/10 p-4 text-amber-300 ring-1 ring-amber-500/30">
          <Icon name="save" />
          <span className="flex-1 text-sm">No backup in the last 14 days — export one in Settings</span>
          <Icon name="chevronRight" />
        </Link>
      )}

      {skipDay && <SkipSheet date={skipDay.date} skip={skipDay.skip} onClose={() => setSkipDay(null)} />}
    </div>
  );
}
