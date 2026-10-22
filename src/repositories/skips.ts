import { query } from '../db/client';

export const SKIP_REASONS = ['sick', 'injury', 'tired', 'no_time', 'travel', 'chose_not_to', 'other'] as const;
export type SkipReason = (typeof SKIP_REASONS)[number];
export const SKIP_REASON_NAMES: Record<SkipReason, string> = {
  sick: 'Sick',
  injury: 'Injury',
  tired: 'Tired',
  no_time: 'No time',
  travel: 'Travel',
  chose_not_to: 'Chose not to',
  other: 'Other',
};

export type Skip = { date: string; reason: SkipReason; note: string | null };

export function skipsBetween(from: string, to: string) {
  return query<Skip>('SELECT date, reason, note FROM skip WHERE date BETWEEN ? AND ?', [from, to]);
}

export function saveSkip(s: Skip) {
  return query(
    `INSERT INTO skip (date, reason, note) VALUES (?, ?, ?)
     ON CONFLICT (date) DO UPDATE SET reason = excluded.reason, note = excluded.note`,
    [s.date, s.reason, s.note],
  );
}

export function removeSkip(date: string) {
  return query('DELETE FROM skip WHERE date = ?', [date]);
}
