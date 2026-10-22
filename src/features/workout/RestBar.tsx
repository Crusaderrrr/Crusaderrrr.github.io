import { useEffect, useRef } from 'react';
import { formatClock } from '../../domain/workout';
import { useNow } from '../../hooks/useDbQuery';
import { updateWorkout } from '../../repositories/workouts';
import { beep } from './beep';

/**
 * Countdown derived from the persisted rest_ends_at, so it survives reloads. The "time's up"
 * signal can only fire while the app is visible — iOS suspends background PWAs (SPEC §7).
 */
export default function RestBar({ workoutId, endsAt }: { workoutId: number; endsAt: string }) {
  const now = useNow(250);
  const remaining = (Date.parse(endsAt) - now) / 1000;

  const fired = useRef<string | null>(null);

  useEffect(() => {
    if (remaining > 0 || document.visibilityState !== 'visible' || fired.current === endsAt) return;
    fired.current = endsAt; // ticks keep coming until the cleared value reloads
    beep();
    document.body.animate([{ backgroundColor: '#16a34a' }, { backgroundColor: 'transparent' }], 700);
    void updateWorkout(workoutId, { restEndsAt: null });
  }, [remaining, workoutId, endsAt]);

  const shift = (s: number) =>
    updateWorkout(workoutId, { restEndsAt: new Date(Date.parse(endsAt) + s * 1000).toISOString() });

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-800 bg-neutral-900 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3">
        <button className="rounded-lg bg-neutral-800 px-3 py-2" onClick={() => shift(-15)}>
          −15s
        </button>
        <div className="flex-1 text-center">
          <div className="text-xs text-neutral-400">Rest</div>
          <div className="text-2xl font-bold tabular-nums">{formatClock(Math.ceil(remaining))}</div>
        </div>
        <button className="rounded-lg bg-neutral-800 px-3 py-2" onClick={() => shift(15)}>
          +15s
        </button>
        <button
          className="rounded-lg bg-sky-600 px-3 py-2 font-medium"
          onClick={() => updateWorkout(workoutId, { restEndsAt: null })}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
