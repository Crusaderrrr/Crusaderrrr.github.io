import { describe, expect, it } from 'vitest';
import { completeValues, formatSet, nextSetValues, parseReps, parseTime, parseWeight, setLabels } from './sets';

describe('sets', () => {
  it('labels sets like Hevy', () => {
    expect(setLabels(['warmup', 'warmup', 'normal', 'normal', 'failure', 'drop', 'normal'])).toEqual(
      ['W', 'W', '1', '2', 'F', 'D', '5'],
    );
    expect(setLabels([])).toEqual([]);
  });

  it('completes a set from previous values when fields are empty', () => {
    const prev = { weightKg: 60, reps: 8 };
    const none = { speedKmh: null, inclinePct: null };
    expect(completeValues({ weightKg: null, reps: null }, prev)).toEqual({ weightKg: 60, reps: 8, ...none });
    expect(completeValues({ weightKg: 70, reps: null }, prev)).toEqual({ weightKg: 70, reps: 8, ...none });
    expect(completeValues({ weightKg: null, reps: 5 }, undefined)).toEqual({ weightKg: 0, reps: 5, ...none });
    expect(completeValues({ weightKg: 50, reps: null }, undefined)).toBeNull();
  });

  it('completes a cardio set; speed and incline stay optional', () => {
    const prev = { weightKg: 0, reps: 1500, speedKmh: 10, inclinePct: 2 };
    expect(completeValues({ weightKg: null, reps: 1200, speedKmh: null, inclinePct: 5 }, prev)).toEqual({
      weightKg: 0,
      reps: 1200,
      speedKmh: 10,
      inclinePct: 5,
    });
    expect(completeValues({ weightKg: null, reps: 600 }, undefined)).toEqual({
      weightKg: 0,
      reps: 600,
      speedKmh: null,
      inclinePct: null,
    });
  });

  it('parses and formats cardio time', () => {
    expect(parseTime('25')).toBe(1500);
    expect(parseTime(' 25:30 ')).toBe(1530);
    expect(parseTime('0:45')).toBe(45);
    expect(parseTime('25.30')).toBe(1530);
    expect(parseTime('25,30')).toBe(1530);
    expect(parseTime('0')).toBeNull();
    expect(parseTime('1:75')).toBeNull();
    expect(parseTime('')).toBeNull();
    expect(formatSet({ weightKg: 0, reps: 1530, speedKmh: 10.5, inclinePct: null }, true)).toBe('25:30 · 10.5 km/h');
    expect(formatSet({ weightKg: 0, reps: 65 }, true)).toBe('1:05');
    expect(formatSet({ weightKg: 60, reps: 8 }, false)).toBe('60 kg × 8');
  });

  it('pre-fills a new set from the one above', () => {
    const none = { speedKmh: null, inclinePct: null };
    expect(nextSetValues([])).toEqual({ weightKg: null, reps: null, ...none });
    expect(nextSetValues([{ weightKg: 40, reps: 10 }, { weightKg: 45, reps: 8 }])).toEqual({
      weightKg: 45,
      reps: 8,
      ...none,
    });
  });

  it('parses weight with comma or dot', () => {
    expect(parseWeight('62,5')).toBe(62.5);
    expect(parseWeight(' 100 ')).toBe(100);
    expect(parseWeight('')).toBeNull();
    expect(parseWeight('-5')).toBeNull();
    expect(parseWeight('abc')).toBeNull();
  });

  it('parses reps as positive integers', () => {
    expect(parseReps('8')).toBe(8);
    expect(parseReps('0')).toBeNull();
    expect(parseReps('7.5')).toBeNull();
    expect(parseReps('')).toBeNull();
  });
});
