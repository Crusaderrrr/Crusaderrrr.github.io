import { query } from '../db/client';
import type { Session } from '../domain/progress';
import type { SetType } from '../domain/sets';
import type { Grip } from './exercises';

type Row = {
  exerciseId: number;
  workoutId: number;
  date: string;
  grip: Grip | null;
  weightKg: number;
  reps: number;
  speedKmh: number | null;
  inclinePct: number | null;
  setType: SetType;
};

export type GripSession = Session & { grip: Grip | null };

/**
 * Completed sets of finished workouts as sessions, chronological, grouped per exercise.
 * A session is one exercise in one workout with one grip. Pass an exercise id to load just
 * one; `includeWorkoutId` also includes an unfinished workout (for PRs in the finish summary).
 */
export async function sessionsByExercise(opts: {
  exerciseId?: number;
  includeWorkoutId?: number;
} = {}): Promise<Map<number, GripSession[]>> {
  const rows = await query<Row>(
    `SELECT we.exercise_id AS exerciseId, w.id AS workoutId, w.date, we.grip, s.weight_kg AS weightKg,
            s.reps, s.speed_kmh AS speedKmh, s.incline_pct AS inclinePct, s.set_type AS setType
     FROM workout_set s
     JOIN workout_exercise we ON we.id = s.workout_exercise_id
     JOIN workout w ON w.id = we.workout_id
     WHERE s.completed = 1 AND (w.finished_at IS NOT NULL OR w.id = ?1)
       AND (?2 IS NULL OR we.exercise_id = ?2)
     ORDER BY w.date, w.started_at, w.id, we.grip, s.position, s.id`,
    [opts.includeWorkoutId ?? null, opts.exerciseId ?? null],
  );
  const byExercise = new Map<number, GripSession[]>();
  for (const r of rows) {
    const sessions = byExercise.get(r.exerciseId) ?? [];
    let last = sessions.at(-1);
    if (last?.workoutId !== r.workoutId || last.grip !== r.grip) {
      last = { workoutId: r.workoutId, date: r.date, grip: r.grip, sets: [] };
      sessions.push(last);
    }
    const { weightKg, reps, speedKmh, inclinePct, setType } = r;
    last.sets.push({ weightKg, reps, speedKmh, inclinePct, setType });
    byExercise.set(r.exerciseId, sessions);
  }
  return byExercise;
}
