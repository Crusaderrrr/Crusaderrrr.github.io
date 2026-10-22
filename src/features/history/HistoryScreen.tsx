import { Link } from 'react-router';
import { parseLocalDate } from '../../domain/dates';
import { prCountByWorkout } from '../../domain/progress';
import { formatWeight } from '../../domain/sets';
import { formatDuration } from '../../domain/workout';
import { useDbQuery } from '../../hooks/useDbQuery';
import { sessionsByExercise } from '../../repositories/progress';
import { listHistory } from '../../repositories/workouts';

export const formatDate = (date: string) =>
  parseLocalDate(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export default function HistoryScreen() {
  const data = useDbQuery(async () => {
    const [items, sessions] = await Promise.all([listHistory(), sessionsByExercise()]);
    return { items, prs: prCountByWorkout([...sessions.values()]) };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold">History</h1>
      {data?.items.length === 0 && (
        <p className="py-12 text-center text-neutral-500">No workouts yet. Finished workouts show up here.</p>
      )}
      {data?.items.map((w) => {
        const prs = data.prs.get(w.id) ?? 0;
        return (
          <Link key={w.id} to={`/history/${w.id}`} className="rounded-2xl bg-neutral-900 p-4 active:bg-neutral-800">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="truncate font-semibold">{w.title}</h2>
              <span className="shrink-0 text-sm text-neutral-400">{formatDate(w.date)}</span>
            </div>
            <div className="mt-2 flex gap-4 text-sm text-neutral-300">
              <span>⏱ {formatDuration((Date.parse(w.finishedAt!) - Date.parse(w.startedAt)) / 1000)}</span>
              <span>🏋 {formatWeight(w.volume)} kg</span>
              {prs > 0 && <span>🏆 {prs} PR{prs > 1 ? 's' : ''}</span>}
            </div>
            <ul className="mt-2 text-sm text-neutral-400">
              {w.exercises.slice(0, 5).map((e, i) => (
                <li key={i}>
                  {e.sets} × {e.name}
                </li>
              ))}
              {w.exercises.length > 5 && <li>+{w.exercises.length - 5} more</li>}
            </ul>
          </Link>
        );
      })}
    </div>
  );
}
