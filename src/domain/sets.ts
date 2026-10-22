export type SetType = 'normal' | 'warmup' | 'drop' | 'failure';
export const SET_TYPES: SetType[] = ['normal', 'warmup', 'drop', 'failure'];
export const SET_TYPE_NAMES: Record<SetType, string> = {
  normal: 'Normal',
  warmup: 'Warm-up',
  drop: 'Drop set',
  failure: 'Failure',
};

export type SetValues = { weightKg: number | null; reps: number | null };

const LETTERS: Record<SetType, string> = { normal: '', warmup: 'W', drop: 'D', failure: 'F' };

/** Hevy-style labels: normal sets are numbered; warm-ups don't advance the counter; W/D/F letters. */
export function setLabels(types: SetType[]): string[] {
  let n = 0;
  return types.map((t) => {
    if (t !== 'warmup') n++;
    return t === 'normal' ? String(n) : LETTERS[t];
  });
}

/**
 * Values to store when a set is ticked: empty fields take the "Previous" values.
 * Returns null if reps are still unknown (the set can't be completed).
 */
export function completeValues(
  set: SetValues,
  previous: SetValues | undefined,
): { weightKg: number; reps: number } | null {
  const reps = set.reps ?? previous?.reps ?? null;
  if (reps === null) return null;
  return { weightKg: set.weightKg ?? previous?.weightKg ?? 0, reps };
}

/** "Add set" copies the set above; the first set starts empty (Previous shows as placeholder). */
export function nextSetValues(sets: SetValues[]): SetValues {
  const last = sets.at(-1);
  return { weightKg: last?.weightKg ?? null, reps: last?.reps ?? null };
}

/** Accepts both "62.5" and "62,5" (iOS regional keyboards). Empty or invalid → null. */
export function parseWeight(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export function parseReps(text: string): number | null {
  const n = Number(text.trim());
  return text.trim() !== '' && Number.isInteger(n) && n > 0 ? n : null;
}

export function formatWeight(kg: number): string {
  return String(Math.round(kg * 100) / 100);
}
