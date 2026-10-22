import { batch, query, type Statement } from '../db/client';
import type { PlanVersion } from '../domain/calendar';

export async function getPlanVersions(): Promise<PlanVersion[]> {
  const rows = await query<{ effectiveFrom: string; days: string | null }>(
    `SELECT v.effective_from AS effectiveFrom, GROUP_CONCAT(d.weekday) AS days
     FROM plan_version v LEFT JOIN plan_day d ON d.plan_version_id = v.id
     GROUP BY v.id ORDER BY v.effective_from`,
  );
  return rows.map((r) => ({
    effectiveFrom: r.effectiveFrom,
    weekdays: r.days ? r.days.split(',').map(Number) : [],
  }));
}

/** New plan version effective from `date`, replacing one that already starts that day. */
export function savePlan(date: string, weekdays: number[]) {
  const versionId = '(SELECT id FROM plan_version WHERE effective_from = ?)';
  return batch([
    { sql: 'INSERT INTO plan_version (effective_from) VALUES (?) ON CONFLICT DO NOTHING', bind: [date] },
    { sql: `DELETE FROM plan_day WHERE plan_version_id = ${versionId}`, bind: [date] },
    ...weekdays.map(
      (d): Statement => ({
        sql: `INSERT INTO plan_day (plan_version_id, weekday) VALUES (${versionId}, ?)`,
        bind: [date, d],
      }),
    ),
  ]);
}
