import { api, ApiError } from '../api/client';
import {
  EQUIPMENT,
  GRIP_NAMES,
  GRIP_SET_NAMES,
  GRIP_SETS,
  GRIPS,
  label,
  MUSCLE_GROUPS,
  type Equipment,
  type Exercise,
  type Grip,
  type GripSet,
  type MuscleGroup,
} from '../domain/exercises';
import { patchExerciseInfo } from '../domain/workoutDoc';
import { dropCleanDocs, patchOpenDocs } from './workoutStore';

// The exercise types and constants live in domain/; re-exported so screens import from one place.
export { EQUIPMENT, GRIP_NAMES, GRIP_SET_NAMES, GRIP_SETS, GRIPS, label, MUSCLE_GROUPS };
export type { Equipment, Exercise, Grip, GripSet, MuscleGroup };

export const listExercises = (archived = false): Promise<Exercise[]> =>
  api<Exercise[]>('GET', `/exercises${archived ? '?archived=1' : ''}`);

export async function getExercise(id: number): Promise<Exercise | undefined> {
  try {
    return await api<Exercise>('GET', `/exercises/${id}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return undefined;
    throw e;
  }
}

export async function createExercise(e: {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  image: string | null;
  gripSet: GripSet | null;
}): Promise<number> {
  return (await api<Exercise>('POST', '/exercises', e)).id;
}

/** Custom exercises without history are deleted; anything with history is archived (SPEC §4). */
export async function removeExercise(id: number): Promise<'deleted' | 'archived'> {
  return (await api<{ result: 'deleted' | 'archived' }>('DELETE', `/exercises/${id}`)).result;
}

const patch = (id: number, body: object) => api<Exercise>('PATCH', `/exercises/${id}`, body);

export const unarchiveExercise = (id: number) => patch(id, { archived: false });

export async function setGripSet(id: number, gripSet: GripSet | null) {
  await patch(id, { gripSet });
  patchOpenDocs((w) => patchExerciseInfo(w, id, { gripSet }));
}

export async function setExerciseImage(id: number, image: string | null) {
  await patch(id, { image });
  patchOpenDocs((w) => patchExerciseInfo(w, id, { image }));
}

export const setFavorite = (id: number, favorite: boolean) => patch(id, { favorite });

/** Rest chosen in a workout: this exercise keeps it, whatever the default becomes. */
export async function setRestSeconds(id: number, seconds: number) {
  await patch(id, { restSeconds: seconds });
  patchOpenDocs((w) => patchExerciseInfo(w, id, { restSeconds: seconds, restCustom: 1 }));
}

/** Makes the exercise follow the default rest timer again. */
export async function resetRestSeconds(id: number) {
  const e = await patch(id, { restSeconds: null });
  patchOpenDocs((w) => patchExerciseInfo(w, id, { restSeconds: e.restSeconds, restCustom: 0 }));
}

export async function getDefaultRest(): Promise<number> {
  return (await api<{ defaultRestSeconds: number }>('GET', '/settings')).defaultRestSeconds;
}

/** Saves the default and applies it to every exercise whose rest wasn't set in a workout. */
export async function setDefaultRest(seconds: number) {
  await api('PUT', '/settings', { defaultRestSeconds: seconds });
  dropCleanDocs(); // their rest values were copied from the old default
}
