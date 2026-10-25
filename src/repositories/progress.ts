import { api } from '../api/client';
import type { Grip } from '../domain/exercises';
import type { Session } from '../domain/progress';
import { settled } from './workoutStore';

export type GripSession = Session & { grip: Grip | null };

/**
 * Completed sets of finished workouts as sessions, chronological, grouped per exercise.
 * A session is one exercise in one workout with one grip. Pass an exercise id to load just
 * one; `includeWorkoutId` also includes an unfinished workout (for PRs in the finish summary).
 */
export async function sessionsByExercise(
  opts: { exerciseId?: number; includeWorkoutId?: string } = {},
): Promise<Map<number, GripSession[]>> {
  await settled(); // the workout being finished must have reached the server
  const q = new URLSearchParams();
  if (opts.exerciseId !== undefined) q.set('exerciseId', String(opts.exerciseId));
  if (opts.includeWorkoutId) q.set('includeWorkoutId', opts.includeWorkoutId);
  const byExercise = await api<Record<string, GripSession[]>>('GET', `/progress/sessions?${q}`);
  return new Map(Object.entries(byExercise).map(([id, sessions]) => [Number(id), sessions]));
}
