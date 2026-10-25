import { api, ApiError } from '../api/client';
import { notifyChange } from '../api/events';
import type { WorkoutDetail } from '../domain/workoutDoc';

// Workout documents live here while they are open. Edits apply to the cached document at once
// (screens re-render from it) and are saved to the server whole, one request at a time per
// workout, newest document wins. MIGRATION.md §7; phase 10 adds the local copy and offline retry.

type Entry = { doc: WorkoutDetail; saving: Promise<void> | null; again: boolean };

const cache = new Map<string, Entry>();
/** The unfinished workout's id; null = none; undefined = not asked yet. */
let activeId: string | null | undefined;

/** The server computes `previous`; it is read-only, so it is not sent back. */
const toBody = (w: WorkoutDetail) => ({
  ...w,
  exercises: w.exercises.map((e) => ({ ...e, previous: undefined })),
});

function remember(doc: WorkoutDetail): Entry {
  const entry: Entry = { doc, saving: null, again: false };
  cache.set(doc.id, entry);
  return entry;
}

/** Cached document, else fetched; null if the workout does not exist. */
export async function loadWorkout(id: string): Promise<WorkoutDetail | null> {
  const cached = cache.get(id);
  if (cached) return cached.doc;
  try {
    const { workout } = await api<{ workout: WorkoutDetail }>('GET', `/workouts/${id}`);
    return (cache.get(id) ?? remember(workout)).doc;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function loadActive(): Promise<WorkoutDetail | null> {
  if (activeId !== undefined) return activeId ? loadWorkout(activeId) : null;
  const { workout } = await api<{ workout: WorkoutDetail | null }>('GET', '/workouts/active');
  if (!workout) return (activeId = null);
  activeId = workout.id;
  return (cache.get(workout.id) ?? remember(workout)).doc;
}

function sync(entry: Entry): Promise<void> {
  if (entry.saving) {
    entry.again = true;
    return entry.saving;
  }
  const id = entry.doc.id;
  entry.saving = (async () => {
    try {
      do {
        entry.again = false;
        await api('PUT', `/workouts/${id}`, toBody(entry.doc));
      } while (entry.again);
    } catch (e) {
      // The edit did not reach the server: forget the optimistic copy so screens show the truth.
      cache.delete(id);
      if (activeId === id) activeId = undefined;
      notifyChange();
      throw e;
    } finally {
      entry.saving = null;
    }
  })();
  return entry.saving;
}

function apply(entry: Entry, edit: (doc: WorkoutDetail) => WorkoutDetail): Promise<void> {
  entry.doc = edit(entry.doc);
  // Finishing frees the "active workout" slot.
  if (entry.doc.finishedAt && activeId === entry.doc.id) activeId = null;
  notifyChange();
  return sync(entry);
}

/** Applies an edit to a workout's document and saves it. Resolves once the server has it. */
export function mutate(id: string, edit: (doc: WorkoutDetail) => WorkoutDetail): Promise<void> {
  const entry = cache.get(id);
  // Synchronous when cached, so rapid edits are applied in the order they were made.
  if (entry) return apply(entry, edit);
  return loadWorkout(id).then((doc) => {
    const loaded = doc && cache.get(id);
    if (!loaded) throw new Error('Workout not found');
    return apply(loaded, edit);
  });
}

/** Adds a new document (start / log past) and saves it. */
export function create(doc: WorkoutDetail): Promise<void> {
  const entry = remember(doc);
  if (!doc.finishedAt) activeId = doc.id;
  notifyChange();
  return sync(entry);
}

export async function remove(id: string): Promise<void> {
  const entry = cache.get(id);
  cache.delete(id);
  if (activeId === id) activeId = null;
  notifyChange();
  await entry?.saving?.catch(() => {}); // let an in-flight save land first, so it cannot re-create the row
  await api('DELETE', `/workouts/${id}`);
}

/** Resolves when every pending save is done; reads of derived server data call this first. */
export async function settled(): Promise<void> {
  await Promise.allSettled([...cache.values()].map((e) => e.saving));
}

/** Keeps open documents in step after an exercise was edited (rest timer, grips, photo). */
export function patchOpenDocs(edit: (doc: WorkoutDetail) => WorkoutDetail) {
  for (const entry of cache.values()) entry.doc = edit(entry.doc);
  notifyChange();
}

/** After a settings change that affects many exercises: forget documents without pending saves. */
export function dropCleanDocs() {
  for (const [id, entry] of cache) if (!entry.saving) cache.delete(id);
  activeId = undefined;
}
