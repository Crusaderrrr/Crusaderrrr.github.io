import { addDays, isoWeekday, toLocalDate } from './dates';

export type DayStatus = 'done' | 'extra' | 'skipped' | 'missed' | 'planned' | 'rest';
/** Sorted by effectiveFrom ascending. */
export type PlanVersion = { effectiveFrom: string; weekdays: number[] };

/** Weekdays planned on a date: the latest version effective on or before it (SPEC §4). */
export function plannedWeekdays(versions: PlanVersion[], date: string): number[] {
  let days: number[] = [];
  for (const v of versions) {
    if (v.effectiveFrom > date) break;
    days = v.weekdays;
  }
  return days;
}

export function isPlanned(versions: PlanVersion[], date: string): boolean {
  return plannedWeekdays(versions, date).includes(isoWeekday(date));
}

export function dayStatus(d: {
  date: string;
  today: string;
  planned: boolean;
  done: boolean;
  skipped: boolean;
}): DayStatus {
  if (d.done) return d.planned ? 'done' : 'extra';
  if (d.skipped) return 'skipped';
  if (d.planned) return d.date < d.today ? 'missed' : 'planned';
  return 'rest';
}

/** Inclusive list of dates from → to. */
export function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Month grid, Monday-first; null cells pad the first week. */
export function monthGrid(year: number, month0: number): (string | null)[] {
  const first = toLocalDate(new Date(year, month0, 1));
  const last = toLocalDate(new Date(year, month0 + 1, 0));
  const pad: null[] = Array(isoWeekday(first) - 1).fill(null);
  return [...pad, ...datesBetween(first, last)];
}
