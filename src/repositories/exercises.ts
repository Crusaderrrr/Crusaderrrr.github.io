import { query } from '../db/client';

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
};

const COLS = `id, name, muscle_group AS muscleGroup, equipment, is_custom AS isCustom, archived,
              rest_seconds AS restSeconds, favorite, image`;

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
}): Promise<number> {
  const name = e.name.trim();
  const [dup] = await query('SELECT 1 FROM exercise WHERE name = ?', [name]);
  if (dup) throw new Error(`"${name}" already exists (it may be archived).`);
  const [row] = await query<{ id: number }>(
    `INSERT INTO exercise (name, muscle_group, equipment, is_custom, image) VALUES (?, ?, ?, 1, ?) RETURNING id`,
    [name, e.muscleGroup, e.equipment, e.image],
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

export function setExerciseImage(id: number, image: string | null) {
  return query('UPDATE exercise SET image = ? WHERE id = ?', [image, id]);
}

export function setFavorite(id: number, favorite: boolean) {
  return query('UPDATE exercise SET favorite = ? WHERE id = ?', [favorite ? 1 : 0, id]);
}

export function setRestSeconds(id: number, seconds: number) {
  return query('UPDATE exercise SET rest_seconds = ? WHERE id = ?', [seconds, id]);
}
