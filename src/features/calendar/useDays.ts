import { datesBetween, dayStatus, isPlanned, type DayStatus } from '../../domain/calendar';
import { today } from '../../domain/dates';
import { useDbQuery } from '../../hooks/useDbQuery';
import { getPlanVersions } from '../../repositories/plan';
import { skipsBetween, type Skip } from '../../repositories/skips';
import { workoutsBetween } from '../../repositories/workouts';

export type DayInfo = {
  date: string;
  planned: boolean;
  status: DayStatus;
  workouts: { id: string; title: string; notes: { name: string; note: string }[] }[];
  skip: Skip | undefined;
};

/** Status of every day in [from, to] (SPEC §5.1). */
export function useDays(from: string, to: string): DayInfo[] | undefined {
  return useDbQuery(async () => {
    const [versions, workouts, skips] = await Promise.all([
      getPlanVersions(),
      workoutsBetween(from, to),
      skipsBetween(from, to),
    ]);
    const t = today();
    return datesBetween(from, to).map((date) => {
      const planned = isPlanned(versions, date);
      const ws = workouts.filter((w) => w.date === date);
      const skip = skips.find((s) => s.date === date);
      return {
        date,
        planned,
        workouts: ws,
        skip,
        status: dayStatus({ date, today: t, planned, done: ws.length > 0, skipped: !!skip }),
      };
    });
  }, [from, to]);
}
