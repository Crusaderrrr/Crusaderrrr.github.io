import { batch, query, type Statement } from '../db/client';
import { parseLocalDate, today } from '../domain/dates';
import { nextSetValues, type SetType, type SetValues } from '../domain/sets';
import { defaultTitle } from '../domain/workout';
import type { MuscleGroup } from './exercises';

export type Workout = {
  id: number;
  title: string;
  date: string;
  startedAt: string;
  finishedAt: string | null;
  notes: string | null;
  restEndsAt: string | null;
};

export type WorkoutSet = {
  id: number;
  position: number;
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  completed: number;
};

export type WorkoutExercise = {
  id: number;
  exerciseId: number;
  name: string;
  muscleGroup: MuscleGroup;
  image: string | null;
  restSeconds: number;
  position: number;
  sets: WorkoutSet[];
  /** Completed sets from the most recent earlier finished workout with this exercise. */
  previous: SetValues[];
};

export type WorkoutDetail = Workout & { exercises: WorkoutExercise[] };

const W_COLS = `id, title, date, started_at AS startedAt, finished_at AS finishedAt, notes,
                rest_ends_at AS restEndsAt`;

export async function getActiveWorkout(): Promise<Workout | null> {
  const [w] = await query<Workout>(`SELECT ${W_COLS} FROM workout WHERE finished_at IS NULL`);
  return w ?? null;
}

export async function getWorkout(id: number): Promise<WorkoutDetail | null> {
  const [w] = await query<Workout>(`SELECT ${W_COLS} FROM workout WHERE id = ?`, [id]);
  if (!w) return null;

  const exercises = await query<Omit<WorkoutExercise, 'sets' | 'previous'>>(
    `SELECT we.id, we.exercise_id AS exerciseId, e.name, e.muscle_group AS muscleGroup, e.image,
            e.rest_seconds AS restSeconds, we.position
     FROM workout_exercise we JOIN exercise e ON e.id = we.exercise_id
     WHERE we.workout_id = ? ORDER BY we.position, we.id`,
    [id],
  );
  const sets = await query<WorkoutSet & { weId: number }>(
    `SELECT s.id, s.workout_exercise_id AS weId, s.position, s.set_type AS setType,
            s.weight_kg AS weightKg, s.reps, s.completed
     FROM workout_set s JOIN workout_exercise we ON we.id = s.workout_exercise_id
     WHERE we.workout_id = ? ORDER BY s.position, s.id`,
    [id],
  );
  // For each exercise: the first matching workout_exercise in the latest earlier finished workout.
  const previous = await query<{ exerciseId: number; weightKg: number; reps: number }>(
    `SELECT we.exercise_id AS exerciseId, s.weight_kg AS weightKg, s.reps
     FROM workout_set s JOIN workout_exercise we ON we.id = s.workout_exercise_id
     WHERE s.completed = 1 AND we.id IN (
       SELECT (SELECT we2.id FROM workout_exercise we2 JOIN workout w2 ON w2.id = we2.workout_id
               WHERE we2.exercise_id = x.exercise_id AND w2.finished_at IS NOT NULL AND w2.id <> ?1
                 AND (w2.date, w2.started_at) < (?2, ?3)
               ORDER BY w2.date DESC, w2.started_at DESC, we2.position LIMIT 1)
       FROM (SELECT DISTINCT exercise_id FROM workout_exercise WHERE workout_id = ?1) x)
     ORDER BY s.position, s.id`,
    [id, w.date, w.startedAt],
  );

  return {
    ...w,
    exercises: exercises.map((e) => ({
      ...e,
      sets: sets.filter((s) => s.weId === e.id),
      previous: previous.filter((p) => p.exerciseId === e.exerciseId),
    })),
  };
}

export async function hasFinishedWorkouts(): Promise<boolean> {
  const [row] = await query('SELECT 1 FROM workout WHERE finished_at IS NOT NULL LIMIT 1');
  return !!row;
}

/** Starts today's workout; if today was marked skipped, the skip is removed (SPEC §5.1). */
export async function startWorkout(): Promise<void> {
  const now = new Date();
  await batch([
    { sql: 'DELETE FROM skip WHERE date = ?', bind: [today()] },
    {
      sql: 'INSERT INTO workout (title, date, started_at) VALUES (?, ?, ?)',
      bind: [defaultTitle(now), today(), now.toISOString()],
    },
  ]);
}

/** Creates a finished (empty) workout on a past date, to be filled in via Edit. */
export async function logPastWorkout(date: string): Promise<number> {
  const start = parseLocalDate(date);
  start.setHours(18);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const [, rows] = await batch([
    { sql: 'DELETE FROM skip WHERE date = ?', bind: [date] },
    {
      sql: `INSERT INTO workout (title, date, started_at, finished_at) VALUES (?, ?, ?, ?) RETURNING id`,
      bind: [defaultTitle(start), date, start.toISOString(), end.toISOString()],
    },
  ]);
  return Number(rows![0]!.id);
}

export function deleteWorkout(id: number) {
  return query('DELETE FROM workout WHERE id = ?', [id]);
}

export function updateWorkout(
  id: number,
  fields: Partial<Pick<Workout, 'title' | 'notes' | 'date' | 'startedAt' | 'finishedAt' | 'restEndsAt'>>,
) {
  const cols: Record<string, string> = {
    title: 'title',
    notes: 'notes',
    date: 'date',
    startedAt: 'started_at',
    finishedAt: 'finished_at',
    restEndsAt: 'rest_ends_at',
  };
  const entries = Object.entries(fields);
  if (entries.length === 0) return Promise.resolve([]);
  return query(
    `UPDATE workout SET ${entries.map(([k]) => `${cols[k]} = ?`).join(', ')} WHERE id = ?`,
    [...entries.map(([, v]) => v ?? null), id],
  );
}

/** Adds exercises to the end, each with one empty set (like Hevy). */
export function addExercises(workoutId: number, exerciseIds: number[]) {
  return batch(
    exerciseIds.flatMap((exerciseId): Statement[] => [
      {
        sql: `INSERT INTO workout_exercise (workout_id, exercise_id, position)
              VALUES (?1, ?2, (SELECT COALESCE(MAX(position), -1) + 1 FROM workout_exercise WHERE workout_id = ?1))`,
        bind: [workoutId, exerciseId],
      },
      { sql: 'INSERT INTO workout_set (workout_exercise_id, position) VALUES (last_insert_rowid(), 0)' },
    ]),
  );
}

export function removeWorkoutExercise(weId: number) {
  return query('DELETE FROM workout_exercise WHERE id = ?', [weId]);
}

export function replaceExercise(weId: number, exerciseId: number) {
  return query('UPDATE workout_exercise SET exercise_id = ? WHERE id = ?', [exerciseId, weId]);
}

/** Swaps the positions of two workout exercises. */
export function swapExercises(a: { id: number; position: number }, b: { id: number; position: number }) {
  return batch([
    { sql: 'UPDATE workout_exercise SET position = ? WHERE id = ?', bind: [b.position, a.id] },
    { sql: 'UPDATE workout_exercise SET position = ? WHERE id = ?', bind: [a.position, b.id] },
  ]);
}

export function addSet(we: WorkoutExercise) {
  const v = nextSetValues(we.sets);
  const position = (we.sets.at(-1)?.position ?? -1) + 1;
  return query('INSERT INTO workout_set (workout_exercise_id, position, weight_kg, reps) VALUES (?, ?, ?, ?)', [
    we.id,
    position,
    v.weightKg,
    v.reps,
  ]);
}

/** Clearing a field of a completed set also un-completes it (completed sets need both values). */
export function updateSetValue(id: number, field: 'weight_kg' | 'reps', value: number | null) {
  return query(
    `UPDATE workout_set SET ${field} = ?1, completed = CASE WHEN ?1 IS NULL THEN 0 ELSE completed END
     WHERE id = ?2`,
    [value, id],
  );
}

export function setSetType(id: number, type: SetType) {
  return query('UPDATE workout_set SET set_type = ? WHERE id = ?', [type, id]);
}

export function deleteSet(id: number) {
  return query('DELETE FROM workout_set WHERE id = ?', [id]);
}

/** Marks a set done with final values and (optionally) starts the rest timer. */
export function completeSet(
  setId: number,
  values: { weightKg: number; reps: number },
  rest?: { workoutId: number; seconds: number },
) {
  const statements: Statement[] = [
    {
      sql: 'UPDATE workout_set SET weight_kg = ?, reps = ?, completed = 1 WHERE id = ?',
      bind: [values.weightKg, values.reps, setId],
    },
  ];
  if (rest && rest.seconds > 0) {
    const endsAt = new Date(Date.now() + rest.seconds * 1000).toISOString();
    statements.push({ sql: 'UPDATE workout SET rest_ends_at = ? WHERE id = ?', bind: [endsAt, rest.workoutId] });
  }
  return batch(statements);
}

export function uncompleteSet(id: number) {
  return query('UPDATE workout_set SET completed = 0 WHERE id = ?', [id]);
}

/**
 * Finalizes a workout: completes the given sets, drops every other incomplete set and any
 * exercise left without sets, then applies the workout fields (e.g. finished_at, title).
 */
export function finalizeWorkout(
  workoutId: number,
  complete: { id: number; weightKg: number; reps: number }[],
  fields: { title?: string; notes?: string | null; finishedAt?: string },
) {
  const statements: Statement[] = complete.map((s) => ({
    sql: 'UPDATE workout_set SET weight_kg = ?, reps = ?, completed = 1 WHERE id = ?',
    bind: [s.weightKg, s.reps, s.id],
  }));
  statements.push(
    {
      sql: `DELETE FROM workout_set WHERE completed = 0 AND workout_exercise_id IN
            (SELECT id FROM workout_exercise WHERE workout_id = ?)`,
      bind: [workoutId],
    },
    {
      sql: `DELETE FROM workout_exercise WHERE workout_id = ? AND id NOT IN
            (SELECT workout_exercise_id FROM workout_set)`,
      bind: [workoutId],
    },
    {
      sql: `UPDATE workout SET title = COALESCE(?, title), notes = COALESCE(?, notes),
            finished_at = COALESCE(?, finished_at), rest_ends_at = NULL WHERE id = ?`,
      bind: [fields.title ?? null, fields.notes ?? null, fields.finishedAt ?? null, workoutId],
    },
  );
  return batch(statements);
}

export type HistoryItem = Workout & {
  exercises: { name: string; sets: number }[];
  volume: number;
};

export async function listHistory(): Promise<HistoryItem[]> {
  const workouts = await query<Workout>(
    `SELECT ${W_COLS} FROM workout WHERE finished_at IS NOT NULL ORDER BY date DESC, started_at DESC`,
  );
  const rows = await query<{ workoutId: number; name: string; sets: number; volume: number }>(
    `SELECT we.workout_id AS workoutId, e.name, COUNT(s.id) AS sets,
            COALESCE(SUM(CASE WHEN s.set_type <> 'warmup' THEN s.weight_kg * s.reps END), 0) AS volume
     FROM workout_exercise we
     JOIN exercise e ON e.id = we.exercise_id
     JOIN workout w ON w.id = we.workout_id AND w.finished_at IS NOT NULL
     LEFT JOIN workout_set s ON s.workout_exercise_id = we.id AND s.completed = 1
     GROUP BY we.id ORDER BY we.position, we.id`,
  );
  return workouts.map((w) => {
    const mine = rows.filter((r) => r.workoutId === w.id);
    return {
      ...w,
      exercises: mine.map((r) => ({ name: r.name, sets: r.sets })),
      volume: mine.reduce((a, r) => a + r.volume, 0),
    };
  });
}

/** Finished workouts in a date range (for the calendar). */
export function workoutsBetween(from: string, to: string) {
  return query<{ id: number; title: string; date: string }>(
    `SELECT id, title, date FROM workout
     WHERE finished_at IS NOT NULL AND date BETWEEN ? AND ? ORDER BY date, started_at`,
    [from, to],
  );
}
