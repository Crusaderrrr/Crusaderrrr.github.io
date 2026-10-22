import { describe, expect, it } from 'vitest';
import { addDays, isoWeekday, parseLocalDate, toLocalDate } from './dates';

describe('dates', () => {
  it('formats the local date, not the UTC one', () => {
    // 23:30 local on Jan 5 — toISOString() would give Jan 5 or 6 depending on TZ.
    expect(toLocalDate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
    expect(toLocalDate(new Date(2026, 0, 5, 0, 5))).toBe('2026-01-05');
  });

  it('parses to local midnight and round-trips', () => {
    const d = parseLocalDate('2026-03-09');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 9, 0]);
    expect(toLocalDate(d)).toBe('2026-03-09');
  });

  it('adds days across month, year and DST boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30'); // EU DST switch on Mar 29
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26'); // EU DST end on Oct 25
  });

  it('uses ISO weekdays (Mon = 1, Sun = 7)', () => {
    expect(isoWeekday('2026-10-19')).toBe(1); // Monday
    expect(isoWeekday('2026-10-24')).toBe(6); // Saturday
    expect(isoWeekday('2026-10-25')).toBe(7); // Sunday
  });
});
