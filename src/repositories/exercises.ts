import { batch, query } from '../db/client';

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'legs',
  'glutes',
  'core',
  'full_body',
] as const;
export const EQUIPMENT = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'other'] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export type Equipment = (typeof EQUIPMENT)[number];

export const GRIPS = ['wide', 'normal', 'narrow', 'parallel_wide', 'parallel_normal'] as const;
export type Grip = (typeof GRIPS)[number];
export const GRIP_NAMES: Record<Grip, string> = {
  wide: 'Wide',
  normal: 'Normal',
  narrow: 'Narrow',
  parallel_wide: 'Parallel wide',
  parallel_normal: 'Parallel normal',
};

export const label = (s: string) => (s === 'full_body' ? 'Full body' : s[0]!.toUpperCase() + s.slice(1));

export type Exercise = {
  id: number;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  isCustom: number;
  archived: number;
  restSeconds: number;
  favorite: number;
  /** Bundled photo path or JPEG data URL; null → muscle-group icon. */
  image: string | null;
  /** Offers the grip selector when logged (lat pulldown, rows…). */
  hasGrip: number;
};

const COLS = `id, name, muscle_group AS muscleGroup, equipment, is_custom AS isCustom, archived,
              rest_seconds AS restSeconds, favorite, image, has_grip AS hasGrip`;

const DEFAULT_REST_SQL = `(SELECT CAST(value AS INTEGER) FROM meta WHERE key = 'default_rest_seconds')`;

export function listExercises(archived = false): Promise<Exercise[]> {
  return query<Exercise>(`SELECT ${COLS} FROM exercise WHERE archived = ? ORDER BY name`, [archived ? 1 : 0]);
}

export async function getExercise(id: number): Promise<Exercise | undefined> {
  const [row] = await query<Exercise>(`SELECT ${COLS} FROM exercise WHERE id = ?`, [id]);
  return row;
}

export async function createExercise(e: {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  image: string | null;
  hasGrip: boolean;
}): Promise<number> {
  const name = e.name.trim();
  const [dup] = await query('SELECT 1 FROM exercise WHERE name = ?', [name]);
  if (dup) throw new Error(`"${name}" already exists (it may be archived).`);
  const [row] = await query<{ id: number }>(
    `INSERT INTO exercise (name, muscle_group, equipment, is_custom, image, has_grip, rest_seconds)
     VALUES (?, ?, ?, 1, ?, ?, COALESCE(${DEFAULT_REST_SQL}, 120)) RETURNING id`,
    [name, e.muscleGroup, e.equipment, e.image, e.hasGrip ? 1 : 0],
  );
  return row!.id;
}

/** Custom exercises without history are deleted; anything with history is archived (SPEC §4). */
export async function removeExercise(id: number): Promise<'deleted' | 'archived'> {
  const [used] = await query('SELECT 1 FROM workout_exercise WHERE exercise_id = ? LIMIT 1', [id]);
  const ex = await getExercise(id);
  if (ex?.isCustom && !used) {
    await query('DELETE FROM exercise WHERE id = ?', [id]);
    return 'deleted';
  }
  await query('UPDATE exercise SET archived = 1 WHERE id = ?', [id]);
  return 'archived';
}

export function unarchiveExercise(id: number) {
  return query('UPDATE exercise SET archived = 0 WHERE id = ?', [id]);
}

export function setHasGrip(id: number, hasGrip: boolean) {
  return query('UPDATE exercise SET has_grip = ? WHERE id = ?', [hasGrip ? 1 : 0, id]);
}

export function setExerciseImage(id: number, image: string | null) {
  return query('UPDATE exercise SET image = ? WHERE id = ?', [image, id]);
}

export function setFavorite(id: number, favorite: boolean) {
  return query('UPDATE exercise SET favorite = ? WHERE id = ?', [favorite ? 1 : 0, id]);
}

/** Rest chosen in a workout: this exercise keeps it, whatever the default becomes. */
export function setRestSeconds(id: number, seconds: number) {
  return query('UPDATE exercise SET rest_seconds = ?, rest_custom = 1 WHERE id = ?', [seconds, id]);
}

/** Makes the exercise follow the default rest timer again. */
export function resetRestSeconds(id: number) {
  return query(`UPDATE exercise SET rest_seconds = ${DEFAULT_REST_SQL}, rest_custom = 0 WHERE id = ?`, [id]);
}

export async function getDefaultRest(): Promise<number> {
  const [row] = await query<{ value: string }>(`SELECT value FROM meta WHERE key = 'default_rest_seconds'`);
  return Number(row?.value ?? 120);
}

/** Saves the default and applies it to every exercise whose rest wasn't set in a workout. */
export function setDefaultRest(seconds: number) {
  return batch([
    {
      sql: `INSERT INTO meta (key, value) VALUES ('default_rest_seconds', ?)
            ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
      bind: [String(seconds)],
    },
    { sql: 'UPDATE exercise SET rest_seconds = ? WHERE rest_custom = 0', bind: [seconds] },
  ]);
}
