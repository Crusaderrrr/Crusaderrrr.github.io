import { useState } from 'react';
import { Link } from 'react-router';
import Sheet, { btn } from '../../components/Sheet';
import MuscleIcon from '../../components/MuscleIcon';
import { completeValues, SET_TYPE_NAMES, SET_TYPES, setLabels, type SetType } from '../../domain/sets';
import { formatClock } from '../../domain/workout';
import { setRestSeconds } from '../../repositories/exercises';
import {
  addSet,
  completeSet,
  deleteSet,
  removeWorkoutExercise,
  setSetType,
  uncompleteSet,
  type WorkoutExercise,
  type WorkoutSet,
} from '../../repositories/workouts';
import { unlockAudio } from './beep';
import SetRow, { SET_TYPE_COLOR } from './SetRow';

const SET_TYPE_LETTER: Record<SetType, string> = { normal: '1', warmup: 'W', drop: 'D', failure: 'F' };

const REST_OPTIONS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];
const restLabel = (s: number) => (s === 0 ? 'Off' : formatClock(s));

export default function ExerciseCard({
  we,
  workoutId,
  withRest,
  onMove,
  onReplace,
}: {
  we: WorkoutExercise;
  workoutId: number;
  /** Rest timer only runs during a live workout, not when editing history. */
  withRest: boolean;
  onMove?: (dir: -1 | 1) => void;
  onReplace: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [restMenu, setRestMenu] = useState(false);
  const [typeFor, setTypeFor] = useState<WorkoutSet | null>(null);
  const [shaking, setShaking] = useState<number | null>(null);

  const labels = setLabels(we.sets.map((s) => s.setType));

  const toggle = (set: WorkoutSet, i: number) => {
    if (set.completed) return void uncompleteSet(set.id);
    const values = completeValues(set, we.previous[i]);
    if (!values) {
      setShaking(set.id);
      setTimeout(() => setShaking(null), 400);
      return;
    }
    unlockAudio();
    void completeSet(set.id, values, withRest ? { workoutId, seconds: we.restSeconds } : undefined);
  };

  return (
    <section className="rounded-2xl bg-neutral-900 p-3">
      <div className="flex items-center gap-3">
        <MuscleIcon group={we.muscleGroup} />
        <Link to={`/exercises/${we.exerciseId}`} className="min-w-0 flex-1 truncate font-semibold text-green-500">
          {we.name}
        </Link>
        <button className="px-2 text-xl text-neutral-400" onClick={() => setMenu(true)} aria-label="Exercise menu">
          ⋯
        </button>
      </div>
      {withRest && (
        <button className="mt-1 text-sm text-sky-400" onClick={() => setRestMenu(true)}>
          ⏱ Rest timer: {restLabel(we.restSeconds)}
        </button>
      )}

      <div className="mt-2 grid grid-cols-[2.5rem_1fr_4.5rem_4rem_2.75rem] gap-2 text-center text-xs font-semibold text-neutral-500">
        <span>SET</span>
        <span>PREVIOUS</span>
        <span>KG</span>
        <span>REPS</span>
        <span>✓</span>
      </div>
      {we.sets.map((s, i) => (
        <SetRow
          key={s.id}
          set={s}
          label={labels[i]!}
          previous={we.previous[i]}
          shaking={shaking === s.id}
          onLabel={() => setTypeFor(s)}
          onToggle={() => toggle(s, i)}
        />
      ))}
      <button className={`${btn.secondary} mt-2 w-full py-2`} onClick={() => addSet(we)}>
        + Add set
      </button>

      {typeFor && (
        <Sheet title="Set type" onClose={() => setTypeFor(null)}>
          <div className="flex flex-col gap-2 pb-2">
            {SET_TYPES.map((t) => (
              <button
                key={t}
                // ring-inset: an outer ring gets clipped by the sheet's scroll container
                className={`${btn.secondary} flex items-center gap-3 text-left ${
                  t === typeFor.setType ? 'ring-2 ring-green-600 ring-inset' : ''
                }`}
                onClick={() => {
                  void setSetType(typeFor.id, t);
                  setTypeFor(null);
                }}
              >
                <span className={`w-5 text-center font-bold ${SET_TYPE_COLOR[t]}`}>{SET_TYPE_LETTER[t]}</span>
                {SET_TYPE_NAMES[t]}
              </button>
            ))}
            <button
              className={`${btn.danger} text-left`}
              onClick={() => {
                void deleteSet(typeFor.id);
                setTypeFor(null);
              }}
            >
              Delete set
            </button>
          </div>
        </Sheet>
      )}

      {restMenu && (
        <Sheet title={`Rest timer · ${we.name}`} onClose={() => setRestMenu(false)}>
          <div className="grid grid-cols-3 gap-2 pb-2">
            {REST_OPTIONS.map((s) => (
              <button
                key={s}
                className={btn.chip(s === we.restSeconds) + ' py-3 text-base'}
                onClick={() => {
                  void setRestSeconds(we.exerciseId, s);
                  setRestMenu(false);
                }}
              >
                {restLabel(s)}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {menu && (
        <Sheet title={we.name} onClose={() => setMenu(false)}>
          <div className="flex flex-col gap-2 pb-2">
            <button className={`${btn.secondary} text-left`} onClick={() => (setMenu(false), onReplace())}>
              Replace exercise
            </button>
            {onMove && (
              <>
                <button className={`${btn.secondary} text-left`} onClick={() => (setMenu(false), onMove(-1))}>
                  Move up
                </button>
                <button className={`${btn.secondary} text-left`} onClick={() => (setMenu(false), onMove(1))}>
                  Move down
                </button>
              </>
            )}
            <button
              className={`${btn.danger} text-left`}
              onClick={() => {
                setMenu(false);
                void removeWorkoutExercise(we.id);
              }}
            >
              Remove exercise
            </button>
          </div>
        </Sheet>
      )}
    </section>
  );
}
