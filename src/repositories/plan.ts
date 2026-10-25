import { api } from '../api/client';
import type { PlanVersion } from '../domain/calendar';

export const getPlanVersions = (): Promise<PlanVersion[]> => api<PlanVersion[]>('GET', '/plan');

/** New plan version effective from `date`, replacing one that already starts that day. */
export const savePlan = (date: string, weekdays: number[]) => api('PUT', '/plan', { date, weekdays });
