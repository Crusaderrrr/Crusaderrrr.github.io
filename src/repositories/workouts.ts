import { batch, query, type Statement } from '../db/client';
import { parseLocalDate, today } from '../domain/dates';
import { nextSetValues, type CompletedValues, type SetType, type SetValues } from '../domain/sets';
import { defaultTitle } from '../domain/workout';
import type { Grip, MuscleGroup } from './exercises';

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
  speedKmh: number | null;
  inclinePct: number | null;
  completed: number;
  /** Bit 1 = weight, bit 2 = reps: value was copied from an earlier set, not typed here. */
  autoFill: number;
};

export type WorkoutExercise = {
  id: number;
  exerciseId: number;
  name: string;
  muscleGroup: MuscleGroup;
  image: string | null;
  restSeconds: number;
  /** 1 = rest set in a workout; 0 = follows the default from Settings. */
  restCustom: number;
  hasGrip: number;
  /** Treadmill-style: sets log time / speed / incline instead of kg / reps. */
  isCardio: number;
  grip: Grip | null;
  /** Note for this exercise in this workout only. */
  note: string | null;
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
            e.rest_seconds AS restSeconds, e.rest_custom AS restCustom, e.has_grip AS hasGrip,
            e.is_cardio AS isCardio, we.grip, we.note, we.position
     FROM workout_exercise we JOIN exercise e ON e.id = we.exercise_id
     WHERE we.workout_id = ? ORDER BY we.position, we.id`,
    [id],
  );
  const sets = await query<WorkoutSet & { weId: number }>(
    `SELECT s.id, s.workout_exercise_id AS weId, s.position, s.set_type AS setType,
            s.weight_kg AS weightKg, s.reps, s.speed_kmh AS speedKmh, s.incline_pct AS inclinePct, s.completed,
            s.auto_fill AS autoFill
     FROM workout_set s JOIN workout_exercise we ON we.id = s.workout_exercise_id
     WHERE we.workout_id = ? ORDER BY s.position, s.id`,
    [id],
  );
  // For each (exercise, grip) in this workout: the matching workout_exercise from the latest
  // earlier finished workout. Same grip wins; history logged without a grip is the fallback.
  const previous = await query<SetValues & { exerciseId: number; grip: Grip | null }>(
    `WITH x AS (SELECT DISTINCT exercise_id, grip FROM workout_exercise WHERE workout_id = ?1),
     pick AS (
       SELECT x.exercise_id AS exerciseId, x.grip,
         (SELECT we2.id FROM workout_exercise we2 JOIN workout w2 ON w2.id = we2.workout_id
          WHERE we2.exercise_id = x.exercise_id
            AND (x.grip IS NULL OR we2.grip IS x.grip OR we2.grip IS NULL)
            AND w2.finished_at IS NOT NULL AND w2.id <> ?1 AND (w2.date, w2.started_at) < (?2, ?3)
          ORDER BY (we2.grip IS x.grip) DESC, w2.date DESC, w2.started_at DESC, we2.position
          LIMIT 1) AS weId
       FROM x)
     SELECT pick.exerciseId, pick.grip, s.weight_kg AS weightKg, s.reps, s.speed_kmh AS speedKmh,
            s.incline_pct AS inclinePct
     FROM pick JOIN workout_set s ON s.workout_exercise_id = pick.weId
     WHERE s.completed = 1 ORDER BY s.position, s.id`,
    [id, w.date, w.startedAt],
  );

  return {
    ...w,
    exercises: exercises.map((e) => ({
      ...e,
      sets: sets.filter((s) => s.weId === e.id),
      previous: previous.filter((p) => p.exerciseId === e.exerciseId && p.grip === e.grip),
    })),
  };
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
      // Grip exercises start with the grip used last time (else "normal").
      {
        sql: `UPDATE workout_exercise SET grip = (
                SELECT COALESCE((SELECT grip FROM workout_exercise WHERE exercise_id = ?1 AND grip IS NOT NULL
                                 ORDER BY id DESC LIMIT 1), 'normal')
              ) WHERE id = last_insert_rowid() AND (SELECT has_grip FROM exercise WHERE id = ?1) = 1`,
        bind: [exerciseId],
      },
      { sql: 'INSERT INTO workout_set (workout_exercise_id, position) VALUES (last_insert_rowid(), 0)' },
    ]),
  );
}

export function removeWorkoutExercise(weId: number) {
  return query('DELETE FROM workout_exercise WHERE id = ?', [weId]);
}

export function replaceExercise(weId: number, exerciseId: number) {
  return query(
    `UPDATE workout_exercise SET exercise_id = ?1,
       grip = CASE WHEN (SELECT has_grip FROM exercise WHERE id = ?1) = 1 THEN COALESCE(grip, 'normal') END
     WHERE id = ?2`,
    [exerciseId, weId],
  );
}

export function setGrip(weId: number, grip: Grip) {
  return query('UPDATE workout_exercise SET grip = ? WHERE id = ?', [grip, weId]);
}

/** Persists a new exercise order (workout_exercise ids, top to bottom). */
export function reorderExercises(ids: number[]) {
  return batch(ids.map((id, i) => ({ sql: 'UPDATE workout_exercise SET position = ? WHERE id = ?', bind: [i, id] })));
}

export function setExerciseNote(weId: number, note: string) {
  return query('UPDATE workout_exercise SET note = ? WHERE id = ?', [note.trim() || null, weId]);
}

/** Bits of `workout_set.auto_fill`. */
export const AUTO_WEIGHT = 1;
export const AUTO_REPS = 2;

export function addSet(we: WorkoutExercise) {
  const v = nextSetValues(we.sets);
  const position = (we.sets.at(-1)?.position ?? -1) + 1;
  return query(
    `INSERT INTO workout_set (workout_exercise_id, position, weight_kg, reps, speed_kmh, incline_pct, auto_fill)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    // Copied values count as auto-filled, so editing an earlier set still updates them.
    [we.id, position, v.weightKg, v.reps, v.speedKmh ?? null, v.inclinePct ?? null,
      (v.weightKg === null ? 0 : AUTO_WEIGHT) | (v.reps === null ? 0 : AUTO_REPS)],
  );
}

export type SetField = 'weight_kg' | 'reps' | 'speed_kmh' | 'incline_pct';

/**
 * Clearing weight or reps of a completed set also un-completes it (completed sets need both);
 * speed and incline are optional. A typed weight/reps is copied to the following sets that are
 * not completed and whose value is empty or auto-filled (never to manually edited ones).
 */
export function updateSetValue(id: number, field: SetField, value: number | null) {
  const bit = field === 'weight_kg' ? AUTO_WEIGHT : field === 'reps' ? AUTO_REPS : 0;
  const statements: Statement[] = [
    {
      sql: `UPDATE workout_set SET ${field} = ?1,
              completed = CASE WHEN ?1 IS NULL AND ?3 THEN 0 ELSE completed END,
              auto_fill = auto_fill & ~?4
            WHERE id = ?2`,
      bind: [value, id, bit ? 1 : 0, bit],
    },
  ];
  if (bit) {
    statements.push({
      sql: `UPDATE workout_set SET ${field} = ?1, auto_fill = auto_fill | ?3
            WHERE completed = 0 AND (${field} IS NULL OR auto_fill & ?3)
              AND workout_exercise_id = (SELECT workout_exercise_id FROM workout_set WHERE id = ?2)
              AND position > (SELECT position FROM workout_set WHERE id = ?2)`,
      bind: [value, id, bit],
    });
  }
  return batch(statements);
}

const COMPLETE_SQL =
  'UPDATE workout_set SET weight_kg = ?, reps = ?, speed_kmh = ?, incline_pct = ?, completed = 1, auto_fill = 0 WHERE id = ?';
const completeBind = (id: number, v: CompletedValues) => [v.weightKg, v.reps, v.speedKmh, v.inclinePct, id];

export function setSetType(id: number, type: SetType) {
  return query('UPDATE workout_set SET set_type = ? WHERE id = ?', [type, id]);
}

export function deleteSet(id: number) {
  return query('DELETE FROM workout_set WHERE id = ?', [id]);
}

/** Marks a set done with final values and (optionally) starts the rest timer. */
export function completeSet(
  setId: number,
  values: CompletedValues,
  rest?: { workoutId: number; seconds: number },
) {
  const statements: Statement[] = [{ sql: COMPLETE_SQL, bind: completeBind(setId, values) }];
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
  complete: (CompletedValues & { id: number })[],
  fields: { title?: string; notes?: string | null; finishedAt?: string },
) {
  const statements: Statement[] = complete.map((s) => ({ sql: COMPLETE_SQL, bind: completeBind(s.id, s) }));
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
  exercises: { name: string; sets: number; grip: Grip | null }[];
  volume: number;
};

export async function listHistory(): Promise<HistoryItem[]> {
  const workouts = await query<Workout>(
    `SELECT ${W_COLS} FROM workout WHERE finished_at IS NOT NULL ORDER BY date DESC, started_at DESC`,
  );
  const rows = await query<{ workoutId: number; name: string; grip: Grip | null; sets: number; volume: number }>(
    `SELECT we.workout_id AS workoutId, e.name, we.grip, COUNT(s.id) AS sets,
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
      exercises: mine.map((r) => ({ name: r.name, sets: r.sets, grip: r.grip })),
      volume: mine.reduce((a, r) => a + r.volume, 0),
    };
  });
}

/** Finished workouts in a date range (for the calendar), with their per-exercise notes. */
export async function workoutsBetween(from: string, to: string) {
  const workouts = await query<{ id: number; title: string; date: string }>(
    `SELECT id, title, date FROM workout
     WHERE finished_at IS NOT NULL AND date BETWEEN ? AND ? ORDER BY date, started_at`,
    [from, to],
  );
  const notes = await query<{ workoutId: number; name: string; note: string }>(
    `SELECT we.workout_id AS workoutId, e.name, we.note
     FROM workout_exercise we JOIN exercise e ON e.id = we.exercise_id JOIN workout w ON w.id = we.workout_id
     WHERE we.note IS NOT NULL AND w.finished_at IS NOT NULL AND w.date BETWEEN ? AND ?
     ORDER BY we.position, we.id`,
    [from, to],
  );
  return workouts.map((w) => ({ ...w, notes: notes.filter((n) => n.workoutId === w.id) }));
}
