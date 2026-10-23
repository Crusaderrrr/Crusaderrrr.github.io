import type { SetType, SetValues } from './sets';

export type ProgressSet = SetValues & { weightKg: number; reps: number; setType: SetType };
/** One exercise's completed sets in one finished workout. */
export type Session = { workoutId: number; date: string; sets: ProgressSet[] };
export type SessionStats = {
  workoutId: number;
  date: string;
  topWeight: number;
  e1rm: number | null;
  volume: number;
};
export type Record = { value: number; date: string } | null;
export type PersonalRecords = { topWeight: Record; e1rm: Record; volume: Record };

/** Epley; unreliable beyond 12 reps, so null there (SPEC §5.3). */
export function e1rm(weightKg: number, reps: number): number | null {
  return reps <= 12 ? weightKg * (1 + reps / 30) : null;
}

/** Stats over working sets (warm-ups excluded); null if the session had only warm-ups. */
export function sessionStats(s: Session): SessionStats | null {
  const working = s.sets.filter((x) => x.setType !== 'warmup');
  if (working.length === 0) return null;
  let topWeight = 0;
  let best: number | null = null;
  let volume = 0;
  for (const x of working) {
    topWeight = Math.max(topWeight, x.weightKg);
    volume += x.weightKg * x.reps;
    const est = e1rm(x.weightKg, x.reps);
    if (est !== null && (best === null || est > best)) best = est;
  }
  return { workoutId: s.workoutId, date: s.date, topWeight, e1rm: best, volume };
}

const METRICS = ['topWeight', 'e1rm', 'volume'] as const;

/** Best of each metric with the date it was first reached. */
export function personalRecords(stats: SessionStats[]): PersonalRecords {
  const pr: PersonalRecords = { topWeight: null, e1rm: null, volume: null };
  for (const s of stats) {
    for (const m of METRICS) {
      const v = s[m];
      if (v !== null && v > 0 && (pr[m] === null || v > pr[m].value)) pr[m] = { value: v, date: s.date };
    }
  }
  return pr;
}

/**
 * PRs set per workout: a metric counts when it beats every earlier session of that exercise.
 * The first-ever session of an exercise sets no PRs. Input: per exercise, sessions in
 * chronological order.
 */
export function prCountByWorkout(sessionsPerExercise: Session[][]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const sessions of sessionsPerExercise) {
    const best = { topWeight: 0, e1rm: 0, volume: 0 };
    let first = true;
    for (const session of sessions) {
      const s = sessionStats(session);
      if (!s) continue;
      for (const m of METRICS) {
        const v = s[m] ?? 0;
        if (v > best[m]) {
          if (!first) counts.set(s.workoutId, (counts.get(s.workoutId) ?? 0) + 1);
          best[m] = v;
        }
      }
      first = false;
    }
  }
  return counts;
}
