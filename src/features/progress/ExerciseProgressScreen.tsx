import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { btn } from '../../components/Sheet';
import { addDays, parseLocalDate, today } from '../../domain/dates';
import { personalRecords, sessionStats, type SessionStats } from '../../domain/progress';
import { formatWeight, setLabels } from '../../domain/sets';
import { useDbQuery } from '../../hooks/useDbQuery';
import MuscleIcon from '../../components/MuscleIcon';
import { getExercise, label, removeExercise, setFavorite, unarchiveExercise } from '../../repositories/exercises';
import { sessionsByExercise } from '../../repositories/progress';
import { formatDate } from '../history/HistoryScreen';

const RANGES = { '1M': 30, '3M': 91, '1Y': 365, All: null } as const;
type Range = keyof typeof RANGES;

const shortDate = (d: string) =>
  parseLocalDate(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export default function ExerciseProgressScreen() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>('3M');
  const data = useDbQuery(async () => {
    const [exercise, sessions] = await Promise.all([getExercise(id), sessionsByExercise({ exerciseId: id })]);
    return { exercise, sessions: sessions.get(id) ?? [] };
  }, [id]);

  if (!data) return null;
  const { exercise, sessions } = data;
  if (!exercise) return <Navigate to="/exercises" replace />;

  const stats = sessions.map(sessionStats).filter((s): s is SessionStats => s !== null);
  const days = RANGES[range];
  const from = days === null ? '' : addDays(today(), -days);
  const shown = stats.filter((s) => s.date >= from);
  const pr = personalRecords(stats);

  const remove = async () => {
    const msg = exercise.isCustom
      ? 'Remove this exercise? (It is archived instead if it has history.)'
      : 'Archive this exercise? It will be hidden from lists; history stays.';
    if (!confirm(msg)) return;
    await removeExercise(id);
    navigate('/exercises', { replace: true });
  };

  return (
    <div className="flex flex-col gap-4 pb-6">
      <button className="self-start text-green-500" onClick={() => navigate(-1)}>
        ‹ Back
      </button>
      <div className="flex items-center gap-3">
        <MuscleIcon group={exercise.muscleGroup} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{exercise.name}</h1>
          <p className="text-neutral-400">
            {label(exercise.muscleGroup)} · {label(exercise.equipment)}
            {exercise.archived ? ' · Archived' : ''}
          </p>
        </div>
        <button
          className={`text-3xl ${exercise.favorite ? 'text-yellow-400' : 'text-neutral-600'}`}
          onClick={() => setFavorite(id, !exercise.favorite)}
          aria-label={exercise.favorite ? 'Remove from favourites' : 'Add to favourites'}
        >
          {exercise.favorite ? '★' : '☆'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <PrCard title="Heaviest" value={pr.topWeight && `${formatWeight(pr.topWeight.value)} kg`} date={pr.topWeight?.date} />
        <PrCard title="Best e1RM" value={pr.e1rm && `${formatWeight(Math.round(pr.e1rm.value * 10) / 10)} kg`} date={pr.e1rm?.date} />
        <PrCard title="Best volume" value={pr.volume && `${formatWeight(pr.volume.value)} kg`} date={pr.volume?.date} />
      </div>

      <div className="flex gap-2">
        {(Object.keys(RANGES) as Range[]).map((r) => (
          <button key={r} className={btn.chip(r === range)} onClick={() => setRange(r)}>
            {r}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="py-6 text-center text-neutral-500">No sessions in this range yet.</p>
      ) : (
        <>
          <Chart title="Top weight (kg)" data={shown} dataKey="topWeight" />
          <Chart title="Estimated 1RM (kg)" data={shown} dataKey="e1rm" />
          <Chart title="Volume (kg)" data={shown} dataKey="volume" />
        </>
      )}

      {sessions.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Sessions</h2>
          {[...sessions].reverse().map((s) => {
            const labels = setLabels(s.sets.map((x) => x.setType));
            return (
              <button
                key={s.workoutId}
                className="rounded-2xl bg-neutral-900 p-3 text-left"
                onClick={() => navigate(`/history/${s.workoutId}`)}
              >
                <div className="text-sm text-neutral-400">{formatDate(s.date)}</div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-sm">
                  {s.sets.map((x, i) => (
                    <span key={i}>
                      <span className="text-neutral-500">{labels[i]}</span>{' '}
                      {x.weightKg ? `${formatWeight(x.weightKg)}×${x.reps}` : `${x.reps} reps`}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </section>
      )}

      {exercise.archived ? (
        <button className={btn.secondary} onClick={() => unarchiveExercise(id)}>
          Unarchive exercise
        </button>
      ) : (
        <button className={btn.danger} onClick={remove}>
          {exercise.isCustom ? 'Remove exercise' : 'Archive exercise'}
        </button>
      )}
    </div>
  );
}

function PrCard({ title, value, date }: { title: string; value: string | null; date?: string }) {
  return (
    <div className="rounded-2xl bg-neutral-900 p-3">
      <div className="text-xs text-neutral-400">🏆 {title}</div>
      <div className="font-semibold">{value ?? '—'}</div>
      {date && <div className="text-xs text-neutral-500">{shortDate(date)}</div>}
    </div>
  );
}

function Chart({ title, data, dataKey }: { title: string; data: SessionStats[]; dataKey: keyof SessionStats }) {
  return (
    <section className="rounded-2xl bg-neutral-900 p-3">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
          <CartesianGrid stroke="#262626" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: '#a3a3a3', fontSize: 11 }} stroke="#404040" />
          <YAxis domain={['auto', 'auto']} tick={{ fill: '#a3a3a3', fontSize: 11 }} stroke="#404040" />
          <Tooltip
            contentStyle={{ background: '#171717', border: '1px solid #404040', borderRadius: 8 }}
            labelFormatter={(d) => shortDate(String(d))}
            formatter={(v) => [`${formatWeight(Number(v))} kg`, title.split(' (')[0]]}
          />
          <Line type="monotone" dataKey={dataKey} stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
