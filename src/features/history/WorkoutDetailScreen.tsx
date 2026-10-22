import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { btn } from '../../components/Sheet';
import { formatWeight, setLabels } from '../../domain/sets';
import { formatDuration, summarize } from '../../domain/workout';
import { useDbQuery } from '../../hooks/useDbQuery';
import { deleteWorkout, getWorkout } from '../../repositories/workouts';
import ExerciseThumb from '../../components/ExerciseThumb';
import { Stat } from '../workout/FinishSheet';
import { SET_TYPE_COLOR } from '../workout/SetRow';
import WorkoutEditor from '../workout/WorkoutEditor';
import { formatDate } from './HistoryScreen';

function useWorkoutParam() {
  const id = Number(useParams().id);
  return useDbQuery(() => getWorkout(id), [id]);
}

export function WorkoutDetailScreen() {
  const navigate = useNavigate();
  const w = useWorkoutParam();
  if (w === undefined) return null;
  if (w === null) return <Navigate to="/history" replace />;
  if (!w.finishedAt) return <Navigate to="/workout" replace />;

  const summary = summarize(w.exercises.flatMap((e) => e.sets));

  return (
    <div className="flex flex-col gap-3 pb-6">
      <button className="self-start text-green-500" onClick={() => navigate(-1)}>
        ‹ Back
      </button>
      <div>
        <h1 className="text-2xl font-bold">{w.title}</h1>
        <p className="text-neutral-400">{formatDate(w.date)}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-neutral-900 p-3 text-center">
        <Stat label="Duration" value={formatDuration((Date.parse(w.finishedAt) - Date.parse(w.startedAt)) / 1000)} />
        <Stat label="Volume" value={`${formatWeight(summary.volume)} kg`} />
        <Stat label="Sets" value={String(summary.sets)} />
      </div>
      {w.notes && <p className="whitespace-pre-wrap text-neutral-300">{w.notes}</p>}

      {w.exercises.map((we) => {
        const labels = setLabels(we.sets.map((s) => s.setType));
        return (
          <section key={we.id} className="rounded-2xl bg-neutral-900 p-3">
            <Link to={`/exercises/${we.exerciseId}`} className="flex items-center gap-3 font-semibold text-green-500">
              <ExerciseThumb image={we.image} muscleGroup={we.muscleGroup} />
              {we.name}
            </Link>
            <ul className="mt-2 space-y-1">
              {we.sets.map((s, i) => (
                <li key={s.id} className="flex gap-3 text-sm">
                  <span className={`w-6 text-center font-semibold ${SET_TYPE_COLOR[s.setType]}`}>{labels[i]}</span>
                  <span>
                    {s.weightKg ? `${formatWeight(s.weightKg)} kg × ${s.reps}` : `${s.reps} reps`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <Link to={`/history/${w.id}/edit`} className={`${btn.secondary} text-center`}>
        Edit workout
      </Link>
      <button
        className={btn.danger}
        onClick={async () => {
          if (!confirm('Delete this workout? This cannot be undone.')) return;
          await deleteWorkout(w.id);
          navigate('/history', { replace: true });
        }}
      >
        Delete workout
      </button>
    </div>
  );
}

export function EditWorkoutScreen() {
  const w = useWorkoutParam();
  if (w === undefined) return null;
  if (w === null) return <Navigate to="/history" replace />;
  if (!w.finishedAt) return <Navigate to="/workout" replace />;
  return <WorkoutEditor workout={w} mode="edit" />;
}
