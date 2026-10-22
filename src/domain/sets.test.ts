import { describe, expect, it } from 'vitest';
import { completeValues, nextSetValues, parseReps, parseWeight, setLabels } from './sets';

describe('sets', () => {
  it('labels sets like Hevy', () => {
    expect(setLabels(['warmup', 'warmup', 'normal', 'normal', 'failure', 'drop', 'normal'])).toEqual(
      ['W', 'W', '1', '2', 'F', 'D', '5'],
    );
    expect(setLabels([])).toEqual([]);
  });

  it('completes a set from previous values when fields are empty', () => {
    const prev = { weightKg: 60, reps: 8 };
    expect(completeValues({ weightKg: null, reps: null }, prev)).toEqual({ weightKg: 60, reps: 8 });
    expect(completeValues({ weightKg: 70, reps: null }, prev)).toEqual({ weightKg: 70, reps: 8 });
    expect(completeValues({ weightKg: null, reps: 5 }, undefined)).toEqual({ weightKg: 0, reps: 5 });
    expect(completeValues({ weightKg: 50, reps: null }, undefined)).toBeNull();
  });

  it('pre-fills a new set from the one above', () => {
    expect(nextSetValues([])).toEqual({ weightKg: null, reps: null });
    expect(nextSetValues([{ weightKg: 40, reps: 10 }, { weightKg: 45, reps: 8 }])).toEqual({
      weightKg: 45,
      reps: 8,
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
