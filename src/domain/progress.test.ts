import { describe, expect, it } from 'vitest';
import { e1rm, personalRecords, prCountByWorkout, sessionStats, type Session } from './progress';

const session = (workoutId: number, date: string, sets: [number, number, string?][]): Session => ({
  workoutId,
  date,
  sets: sets.map(([weightKg, reps, t]) => ({
    weightKg,
    reps,
    setType: (t ?? 'normal') as Session['sets'][number]['setType'],
  })),
});

describe('progress', () => {
  it('estimates 1RM with Epley up to 12 reps', () => {
    expect(e1rm(100, 3)).toBeCloseTo(110);
    expect(e1rm(60, 12)).toBeCloseTo(84);
    expect(e1rm(60, 13)).toBeNull();
  });

  it('computes session stats excluding warm-ups', () => {
    const s = sessionStats(session(1, '2026-01-01', [[40, 10, 'warmup'], [100, 5], [90, 15]]));
    expect(s).toEqual({
      workoutId: 1,
      date: '2026-01-01',
      topWeight: 100,
      e1rm: 100 * (1 + 5 / 30),
      volume: 100 * 5 + 90 * 15,
    });
    expect(sessionStats(session(2, '2026-01-02', [[40, 10, 'warmup']]))).toBeNull();
    expect(sessionStats(session(3, '2026-01-03', [[50, 20]]))?.e1rm).toBeNull();
  });

  it('finds personal records with the date first achieved', () => {
    const stats = [
      sessionStats(session(1, '2026-01-01', [[100, 5]]))!,
      sessionStats(session(2, '2026-01-08', [[100, 5]]))!,
      sessionStats(session(3, '2026-01-15', [[90, 10]]))!,
    ];
    const pr = personalRecords(stats);
    expect(pr.topWeight).toEqual({ value: 100, date: '2026-01-01' });
    expect(pr.e1rm).toEqual({ value: 120, date: '2026-01-15' });
    expect(pr.volume).toEqual({ value: 900, date: '2026-01-15' });
    expect(personalRecords([])).toEqual({ topWeight: null, e1rm: null, volume: null });
  });

  it('counts PRs per workout, ignoring the first session', () => {
    const bench = [
      session(1, '2026-01-01', [[100, 5]]),
      session(2, '2026-01-08', [[105, 5]]), // weight, e1RM, volume → 3
      session(3, '2026-01-15', [[100, 5]]), // nothing
    ];
    const squat = [session(2, '2026-01-08', [[140, 5]]), session(3, '2026-01-15', [[140, 6]])];
    const counts = prCountByWorkout([bench, squat]);
    expect(counts.get(1)).toBeUndefined();
    expect(counts.get(2)).toBe(3);
    expect(counts.get(3)).toBe(2); // squat e1RM + volume
  });
});
