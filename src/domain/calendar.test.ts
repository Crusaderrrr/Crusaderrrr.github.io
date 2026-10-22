import { describe, expect, it } from 'vitest';
import { datesBetween, dayStatus, isPlanned, monthGrid, plannedWeekdays } from './calendar';

const versions = [
  { effectiveFrom: '2026-01-01', weekdays: [1, 3, 5] }, // Mon/Wed/Fri
  { effectiveFrom: '2026-02-01', weekdays: [2, 4] }, // Tue/Thu
];

describe('calendar', () => {
  it('uses the plan version effective on the date', () => {
    expect(plannedWeekdays(versions, '2025-12-31')).toEqual([]);
    expect(plannedWeekdays(versions, '2026-01-01')).toEqual([1, 3, 5]);
    expect(plannedWeekdays(versions, '2026-01-31')).toEqual([1, 3, 5]);
    expect(plannedWeekdays(versions, '2026-02-01')).toEqual([2, 4]);
  });

  it('changing the plan does not rewrite past days', () => {
    expect(isPlanned(versions, '2026-01-26')).toBe(true); // Monday under old plan
    expect(isPlanned(versions, '2026-02-02')).toBe(false); // Monday under new plan
    expect(isPlanned(versions, '2026-02-03')).toBe(true); // Tuesday
  });

  it('derives day status', () => {
    const base = { date: '2026-03-10', today: '2026-03-12', planned: true, done: false, skipped: false };
    expect(dayStatus({ ...base, done: true })).toBe('done');
    expect(dayStatus({ ...base, done: true, planned: false })).toBe('extra');
    expect(dayStatus({ ...base, skipped: true })).toBe('skipped');
    expect(dayStatus(base)).toBe('missed');
    expect(dayStatus({ ...base, date: '2026-03-12' })).toBe('planned');
    expect(dayStatus({ ...base, date: '2026-03-20' })).toBe('planned');
    expect(dayStatus({ ...base, planned: false })).toBe('rest');
  });

  it('builds Monday-first month grids', () => {
    const oct = monthGrid(2026, 9); // Oct 1 2026 is a Thursday
    expect(oct.slice(0, 4)).toEqual([null, null, null, '2026-10-01']);
    expect(oct.filter(Boolean)).toHaveLength(31);
    expect(monthGrid(2026, 1).filter(Boolean)).toHaveLength(28);
    expect(datesBetween('2026-12-30', '2027-01-02')).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ]);
  });
});
