import { query } from '../db/client';
import type { Session } from '../domain/progress';
import type { SetType } from '../domain/sets';

type Row = { exerciseId: number; workoutId: number; date: string; weightKg: number; reps: number; setType: SetType };

/**
 * Completed sets of finished workouts as sessions, chronological, grouped per exercise.
 * Pass an exercise id to load just one; `includeWorkoutId` also includes an unfinished workout
 * (for PRs in the finish summary).
 */
export async function sessionsByExercise(opts: {
  exerciseId?: number;
  includeWorkoutId?: number;
} = {}): Promise<Map<number, Session[]>> {
  const rows = await query<Row>(
    `SELECT we.exercise_id AS exerciseId, w.id AS workoutId, w.date, s.weight_kg AS weightKg, s.reps,
            s.set_type AS setType
     FROM workout_set s
     JOIN workout_exercise we ON we.id = s.workout_exercise_id
     JOIN workout w ON w.id = we.workout_id
     WHERE s.completed = 1 AND (w.finished_at IS NOT NULL OR w.id = ?1)
       AND (?2 IS NULL OR we.exercise_id = ?2)
     ORDER BY w.date, w.started_at, w.id, s.position, s.id`,
    [opts.includeWorkoutId ?? null, opts.exerciseId ?? null],
  );
  const byExercise = new Map<number, Session[]>();
  for (const r of rows) {
    const sessions = byExercise.get(r.exerciseId) ?? [];
    let last = sessions.at(-1);
    if (last?.workoutId !== r.workoutId) {
      last = { workoutId: r.workoutId, date: r.date, sets: [] };
      sessions.push(last);
    }
    last.sets.push({ weightKg: r.weightKg, reps: r.reps, setType: r.setType });
    byExercise.set(r.exerciseId, sessions);
  }
  return byExercise;
}
