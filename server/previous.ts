import type { Sql } from './db.js';

export type SetValuesJson = {
  weightKg: number | null;
  reps: number | null;
  speedKmh: number | null;
  inclinePct: number | null;
};

type Row = { weight_kg: number | null; reps: number | null; speed_kmh: number | null; incline_pct: number | null };

/**
 * The "Previous" column: completed sets of the matching exercise in the latest finished workout
 * that started before `before`. The same grip wins; history logged without a grip is the fallback.
 */
export async function previousSets(
  sql: Sql,
  userId: number,
  exerciseId: number,
  grip: string | null,
  before: { date: string; startedAt: string; excludeWorkoutId: string | null },
): Promise<SetValuesJson[]> {
  const rows = await sql<Row[]>`
    SELECT s.weight_kg, s.reps, s.speed_kmh, s.incline_pct
    FROM workout_set s
    WHERE s.completed AND s.workout_exercise_id = (
      SELECT we.id FROM workout_exercise we JOIN workout w ON w.id = we.workout_id
      WHERE w.user_id = ${userId} AND we.exercise_id = ${exerciseId}
        AND (${grip}::text IS NULL OR we.grip IS NOT DISTINCT FROM ${grip}::text OR we.grip IS NULL)
        AND w.finished_at IS NOT NULL
        AND EXISTS (SELECT 1 FROM workout_set s2 WHERE s2.workout_exercise_id = we.id AND s2.completed)
        AND (${before.excludeWorkoutId}::uuid IS NULL OR w.id <> ${before.excludeWorkoutId}::uuid)
        AND (w.date, w.started_at) < (${before.date}::text, ${before.startedAt}::timestamptz)
      ORDER BY (we.grip IS NOT DISTINCT FROM ${grip}::text) DESC, w.date DESC, w.started_at DESC, we.position
      LIMIT 1)
    ORDER BY s.position, s.id`;
  return rows.map((r) => ({
    weightKg: r.weight_kg,
    reps: r.reps,
    speedKmh: r.speed_kmh,
    inclinePct: r.incline_pct,
  }));
}
