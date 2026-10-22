import { describe, expect, it } from 'vitest';
import { defaultTitle, formatClock, formatDuration, summarize } from './workout';

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
