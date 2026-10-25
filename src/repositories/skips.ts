import { api } from '../api/client';

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

export const skipsBetween = (from: string, to: string) => api<Skip[]>('GET', `/skips?from=${from}&to=${to}`);

export const saveSkip = (s: Skip) => api('PUT', `/skips/${s.date}`, { reason: s.reason, note: s.note });

export const removeSkip = (date: string) => api('DELETE', `/skips/${date}`);
