import { useState } from 'react';
import { useNavigate } from 'react-router';
import { btn, input } from '../../components/Sheet';
import { parseLocalDate, toLocalDate } from '../../domain/dates';
import { formatWeight } from '../../domain/sets';
import { formatClock, summarize } from '../../domain/workout';
import { useNow } from '../../hooks/useDbQuery';
import {
  addExercises,
  deleteWorkout,
  finalizeWorkout,
  replaceExercise,
  swapExercises,
  updateWorkout,
  type WorkoutDetail,
} from '../../repositories/workouts';
import ExercisePicker from '../exercises/ExercisePicker';
import ExerciseCard from './ExerciseCard';
import FinishSheet, { resolvableSets, Stat } from './FinishSheet';
import RestBar from './RestBar';

/**
 * The logging screen. `active`: live workout with timer, rest timer and Finish.
 * `edit`: a finished workout from History, plus date/time/duration fields.
 * Every change is written straight to the DB.
 */
export default function WorkoutEditor({ workout, mode }: { workout: WorkoutDetail; mode: 'active' | 'edit' }) {
  const navigate = useNavigate();
  const [picker, setPicker] = useState<{ replace?: number } | null>(null);
  const [finishing, setFinishing] = useState(false);

  const allSets = workout.exercises.flatMap((e) => e.sets);
  const summary = summarize(allSets);

  const finish = () => {
    if (summary.sets === 0 && resolvableSets(workout).length === 0) {
      if (confirm('No sets are done yet. Discard this workout?')) discard();
      return;
    }
    setFinishing(true);
  };

  const discard = async () => {
    await deleteWorkout(workout.id);
    navigate('/', { replace: true });
  };

  // Edit mode: drop incomplete sets; an edit that leaves nothing behind offers deletion.
  const done = async () => {
    if (summary.sets === 0) {
      if (confirm('No completed sets. Delete this workout?')) {
        await deleteWorkout(workout.id);
        navigate('/history', { replace: true });
      }
      return;
    }
    await finalizeWorkout(workout.id, [], {});
    navigate(`/history/${workout.id}`, { replace: true });
  };

  const move = (i: number, dir: -1 | 1) => {
    const a = workout.exercises[i];
    const b = workout.exercises[i + dir];
    if (a && b) void swapExercises(a, b);
  };

  return (
    <div className={`flex flex-col gap-3 ${workout.restEndsAt && mode === 'active' ? 'pb-24' : 'pb-6'}`}>
      <header className="sticky top-0 z-20 -mx-4 -mt-4 border-b border-neutral-800 bg-neutral-950/95 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 backdrop-blur">
        <div className="flex items-center justify-between">
          {mode === 'active' ? (
            <button className="px-1 text-2xl text-neutral-400" onClick={() => navigate('/')} aria-label="Minimize">
              ⌄
            </button>
          ) : (
            <span className="w-6" />
          )}
          <h1 className="font-semibold">{mode === 'active' ? 'Log Workout' : 'Edit Workout'}</h1>
          <button
            className="rounded-lg bg-green-600 px-4 py-1.5 font-semibold"
            onClick={mode === 'active' ? finish : done}
          >
            {mode === 'active' ? 'Finish' : 'Done'}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {mode === 'active' ? <LiveDuration startedAt={workout.startedAt} /> : <span />}
          <Stat label="Volume" value={`${formatWeight(summary.volume)} kg`} />
          <Stat label="Sets" value={String(summary.sets)} />
        </div>
      </header>

      {mode === 'edit' && <EditFields workout={workout} />}

      {workout.exercises.map((we, i) => (
        <ExerciseCard
          key={we.id}
          we={we}
          workoutId={workout.id}
          withRest={mode === 'active'}
          onMove={workout.exercises.length > 1 ? (dir) => move(i, dir) : undefined}
          onReplace={() => setPicker({ replace: we.id })}
        />
      ))}

      {workout.exercises.length === 0 && (
        <p className="py-8 text-center text-neutral-500">Add your first exercise to get started.</p>
      )}

      <button className={btn.primary} onClick={() => setPicker({})}>
        + Add exercise
      </button>
      <button
        className={btn.danger}
        onClick={() => {
          if (confirm(mode === 'active' ? 'Discard this workout?' : 'Delete this workout?')) {
            if (mode === 'active') void discard();
            else void deleteWorkout(workout.id).then(() => navigate('/history', { replace: true }));
          }
        }}
      >
        {mode === 'active' ? 'Discard workout' : 'Delete workout'}
      </button>

      {mode === 'active' && workout.restEndsAt && <RestBar workoutId={workout.id} endsAt={workout.restEndsAt} />}

      {picker && (
        <ExercisePicker
          single={picker.replace !== undefined}
          onClose={() => setPicker(null)}
          onDone={(ids) => {
            setPicker(null);
            if (picker.replace !== undefined) void replaceExercise(picker.replace, ids[0]!);
            else void addExercises(workout.id, ids);
          }}
        />
      )}

      {finishing && (
        <FinishSheet
          workout={workout}
          onClose={() => setFinishing(false)}
          onFinished={() => navigate(`/history/${workout.id}`, { replace: true })}
        />
      )}
    </div>
  );
}

function LiveDuration({ startedAt }: { startedAt: string }) {
  const now = useNow();
  return <Stat label="Duration" value={formatClock((now - Date.parse(startedAt)) / 1000)} />;
}

const timeOf = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Title, date, start time, duration and notes of a finished workout. */
function EditFields({ workout }: { workout: WorkoutDetail }) {
  const durationMin = Math.round((Date.parse(workout.finishedAt!) - Date.parse(workout.startedAt)) / 60000);

  // Keeps duration when date or start time change.
  const setStart = (date: string, time: string, minutes = durationMin) => {
    const start = parseLocalDate(date);
    const [h, m] = time.split(':').map(Number);
    start.setHours(h ?? 0, m ?? 0);
    void updateWorkout(workout.id, {
      date: toLocalDate(start),
      startedAt: start.toISOString(),
      finishedAt: new Date(start.getTime() + minutes * 60000).toISOString(),
    });
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-neutral-900 p-3">
      <input
        className={input}
        defaultValue={workout.title}
        placeholder="Title"
        onChange={(e) => e.target.value.trim() && updateWorkout(workout.id, { title: e.target.value.trim() })}
      />
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs text-neutral-400">
          Date
          <input
            type="date"
            className={`${input} mt-1 px-2`}
            value={workout.date}
            onChange={(e) => e.target.value && setStart(e.target.value, timeOf(workout.startedAt))}
          />
        </label>
        <label className="text-xs text-neutral-400">
          Start
          <input
            type="time"
            className={`${input} mt-1 px-2`}
            value={timeOf(workout.startedAt)}
            onChange={(e) => e.target.value && setStart(workout.date, e.target.value)}
          />
        </label>
        <label className="text-xs text-neutral-400">
          Minutes
          <input
            className={`${input} mt-1 px-2`}
            inputMode="numeric"
            defaultValue={durationMin}
            onChange={(e) => {
              const m = Number(e.target.value);
              if (Number.isInteger(m) && m > 0) setStart(workout.date, timeOf(workout.startedAt), m);
            }}
          />
        </label>
      </div>
      <textarea
        className={input}
        rows={2}
        defaultValue={workout.notes ?? ''}
        placeholder="Notes"
        onChange={(e) => updateWorkout(workout.id, { notes: e.target.value })}
      />
    </section>
  );
}
