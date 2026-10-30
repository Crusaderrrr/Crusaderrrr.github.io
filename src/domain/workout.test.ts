import { describe, expect, it } from 'vitest';
import { defaultTitle, finishedAtFor, formatClock, formatDuration, formatRest, summarize } from './workout';

describe('workout', () => {
  it('names workouts by time of day', () => {
    expect(defaultTitle(new Date(2026, 0, 1, 7))).toBe('Morning Workout');
    expect(defaultTitle(new Date(2026, 0, 1, 13))).toBe('Afternoon Workout');
    expect(defaultTitle(new Date(2026, 0, 1, 19))).toBe('Evening Workout');
    expect(defaultTitle(new Date(2026, 0, 1, 2))).toBe('Night Workout');
  });

  it('formats clocks and durations', () => {
    expect(formatClock(245)).toBe('4:05');
    expect(formatClock(3723)).toBe('1:02:03');
    expect(formatClock(-3)).toBe('0:00');
    expect(formatDuration(45 * 60)).toBe('45m');
    expect(formatDuration(65 * 60)).toBe('1h 5m');
    expect(formatRest(0)).toBe('Off');
    expect(formatRest(90)).toBe('1:30');
  });

  it('summarizes completed sets, excluding warm-ups from volume', () => {
    expect(
      summarize([
        { weightKg: 20, reps: 10, setType: 'warmup', completed: 1 },
        { weightKg: 60, reps: 8, setType: 'normal', completed: 1 },
        { weightKg: 60, reps: 8, setType: 'normal', completed: 0 },
        { weightKg: 40, reps: 12, setType: 'drop', completed: 1 },
      ]),
    ).toEqual({ sets: 3, volume: 960 });
  });
});

describe('finishedAtFor', () => {
  const startedAt = '2026-10-30T10:00:00.000Z';
  const start = Date.parse(startedAt);
  const treadmill = { isCardio: 1, sets: [{ completed: 1, reps: 1800 }] };
  const bench = { isCardio: 0, sets: [{ completed: 1, reps: 8 }] };

  it('lifts a short workout to the logged cardio time', () => {
    const now = start + 10 * 60_000;
    expect(finishedAtFor({ startedAt, exercises: [bench, treadmill] }, now)).toBe(new Date(start + 30 * 60_000).toISOString());
  });

  it('keeps the real end when the workout was longer', () => {
    const now = start + 60 * 60_000;
    expect(finishedAtFor({ startedAt, exercises: [treadmill] }, now)).toBe(new Date(now).toISOString());
  });

  it('ignores strength reps and incomplete cardio sets', () => {
    const now = start + 5 * 60_000;
    const unfinished = { isCardio: 1, sets: [{ completed: 0, reps: 1800 }] };
    expect(finishedAtFor({ startedAt, exercises: [bench, unfinished] }, now)).toBe(new Date(now).toISOString());
  });
});
