export type SetType = 'normal' | 'warmup' | 'drop' | 'failure';
export const SET_TYPES: SetType[] = ['normal', 'warmup', 'drop', 'failure'];
export const SET_TYPE_NAMES: Record<SetType, string> = {
  normal: 'Normal',
  warmup: 'Warm-up',
  drop: 'Drop set',
  failure: 'Failure',
};

/**
 * Cardio exercises (treadmill) reuse the columns: `reps` = time in seconds, `weightKg` = 0,
 * plus optional speed (km/h) and incline (%). Strength sets leave those two null.
 */
export type SetValues = {
  weightKg: number | null;
  reps: number | null;
  speedKmh?: number | null;
  inclinePct?: number | null;
};
export type CompletedValues = { weightKg: number; reps: number; speedKmh: number | null; inclinePct: number | null };

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
): CompletedValues | null {
  const reps = set.reps ?? previous?.reps ?? null;
  if (reps === null) return null;
  return {
    weightKg: set.weightKg ?? previous?.weightKg ?? 0,
    reps,
    speedKmh: set.speedKmh ?? previous?.speedKmh ?? null,
    inclinePct: set.inclinePct ?? previous?.inclinePct ?? null,
  };
}

/** "Add set" copies the set above; the first set starts empty (Previous shows as placeholder). */
export function nextSetValues(sets: SetValues[]): SetValues {
  const last = sets.at(-1);
  return {
    weightKg: last?.weightKg ?? null,
    reps: last?.reps ?? null,
    speedKmh: last?.speedKmh ?? null,
    inclinePct: last?.inclinePct ?? null,
  };
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

/**
 * Cardio time: "25" = 25 min, "25:30" = 25 min 30 s. "." and "," also separate seconds, since
 * the iOS decimal keypad has no ":". Empty, invalid or zero → null.
 */
export function parseTime(text: string): number | null {
  const m = /^(\d+)(?:[:.,]([0-5]?\d))?$/.exec(text.trim());
  if (!m) return null;
  const seconds = Number(m[1]) * 60 + Number(m[2] ?? 0);
  return seconds > 0 ? seconds : null;
}

/** "25:00", "90:05" (minutes aren't rolled into hours: treadmill displays count minutes). */
export function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** One logged set as text: "60 kg × 8", "12 reps", or "25:00 · 10 km/h · 3%". */
export function formatSet(s: SetValues, cardio: boolean): string {
  if (s.reps === null) return '—';
  if (cardio) {
    return [
      formatTime(s.reps),
      s.speedKmh != null && `${formatWeight(s.speedKmh)} km/h`,
      s.inclinePct != null && `${formatWeight(s.inclinePct)}%`,
    ]
      .filter(Boolean)
      .join(' · ');
  }
  return s.weightKg ? `${formatWeight(s.weightKg)} kg × ${s.reps}` : `${s.reps} reps`;
}
