import type { SetType } from './sets';

export function defaultTitle(d: Date): string {
  const h = d.getHours();
  if (h >= 5 && h < 12) return 'Morning Workout';
  if (h >= 12 && h < 17) return 'Afternoon Workout';
  if (h >= 17 && h < 22) return 'Evening Workout';
  return 'Night Workout';
}

/** Live clock: "4:05", "1:02:03". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Compact duration for cards: "45m", "1h 5m". */
export function formatDuration(totalSeconds: number): string {
  const m = Math.max(0, Math.round(totalSeconds / 60));
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

type SummarySet = { weightKg: number | null; reps: number | null; setType: SetType; completed: number };

/** Completed-set count and volume (warm-ups excluded from volume, as in progress stats). */
export function summarize(sets: SummarySet[]): { sets: number; volume: number } {
  let count = 0;
  let volume = 0;
  for (const s of sets) {
    if (!s.completed) continue;
    count++;
    if (s.setType !== 'warmup') volume += (s.weightKg ?? 0) * (s.reps ?? 0);
  }
  return { sets: count, volume };
}
