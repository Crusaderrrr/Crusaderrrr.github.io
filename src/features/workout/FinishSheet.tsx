import { useState } from 'react';
import Sheet, { btn, input } from '../../components/Sheet';
import { prCountByWorkout } from '../../domain/progress';
import { completeValues, formatWeight } from '../../domain/sets';
import { formatDuration, summarize } from '../../domain/workout';
import { useDbQuery, useNow } from '../../hooks/useDbQuery';
import { sessionsByExercise } from '../../repositories/progress';
import { finalizeWorkout, type WorkoutDetail } from '../../repositories/workouts';

/** Incomplete sets that could be ticked now (have values, or Previous to fall back on). */
export function resolvableSets(w: WorkoutDetail) {
  return w.exercises.flatMap((we) =>
    we.sets.flatMap((s, i) => {
      if (s.completed) return [];
      const v = completeValues(s, we.previous[i]);
      return v ? [{ id: s.id, ...v }] : [];
    }),
  );
}

/**
 * Finish flow (SPEC §6.2): resolve incomplete sets first, then a save sheet with title, notes
 * and a summary. Callers handle the "no completed sets at all" case before opening this.
 */
export default function FinishSheet({
  workout,
  onClose,
  onFinished,
}: {
  workout: WorkoutDetail;
  onClose: () => void;
  onFinished: () => void;
}) {
  const allSets = workout.exercises.flatMap((e) => e.sets);
  const incomplete = allSets.filter((s) => !s.completed).length;
  const completed = allSets.length - incomplete;
  const resolvable = resolvableSets(workout);

  const [title, setTitle] = useState(workout.title);
  const [notes, setNotes] = useState(workout.notes ?? '');
  const now = useNow();

  const prs = useDbQuery(
    async () =>
      prCountByWorkout([...(await sessionsByExercise({ includeWorkoutId: workout.id })).values()]).get(
        workout.id,
      ) ?? 0,
    [workout.id],
  );

  if (incomplete > 0) {
    return (
      <Sheet title="Unfinished sets" onClose={onClose}>
        <p className="mb-4 text-neutral-400">
          {incomplete} set{incomplete === 1 ? ' is' : 's are'} not marked done.
        </p>
        <div className="flex flex-col gap-2 pb-2">
          {resolvable.length > 0 && (
            <button className={btn.primary} onClick={() => finalizeWorkout(workout.id, resolvable, {})}>
              Complete {resolvable.length === incomplete ? 'them' : `${resolvable.length} with values`}
            </button>
          )}
          {completed > 0 && (
            <button className={btn.secondary} onClick={() => finalizeWorkout(workout.id, [], {})}>
              Discard incomplete sets
            </button>
          )}
          <button className={btn.secondary} onClick={onClose}>
            Keep logging
          </button>
        </div>
      </Sheet>
    );
  }

  const summary = summarize(allSets);
  const duration = (now - Date.parse(workout.startedAt)) / 1000;

  return (
    <Sheet title="Save workout" onClose={onClose}>
      <div className="flex flex-col gap-3 pb-2">
        <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <textarea
          className={input}
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did it go?"
        />
        <div className="grid grid-cols-4 gap-2 text-center">
          <Stat label="Duration" value={formatDuration(duration)} />
          <Stat label="Volume" value={`${formatWeight(summary.volume)} kg`} />
          <Stat label="Sets" value={String(summary.sets)} />
          <Stat label="PRs" value={prs === undefined ? '…' : `🏆 ${prs}`} />
        </div>
        <button
          className={btn.primary}
          onClick={async () => {
            await finalizeWorkout(workout.id, [], {
              title: title.trim() || workout.title,
              notes,
              finishedAt: new Date().toISOString(),
            });
            onFinished();
          }}
        >
          Save workout
        </button>
      </div>
    </Sheet>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}
