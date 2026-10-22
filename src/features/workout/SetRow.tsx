import { useRef, useState } from 'react';
import Icon from '../../components/Icon';
import { formatWeight, parseReps, parseWeight, type SetType, type SetValues } from '../../domain/sets';
import { deleteSet, updateSetValue, type WorkoutSet } from '../../repositories/workouts';

const fmt = (n: number | null) => (n === null ? '' : formatWeight(n));

/** Column layout shared by the set table header and its rows. */
export const SET_GRID = 'grid grid-cols-[2.5rem_1fr_4.5rem_4rem_2.75rem] items-center gap-2';

const field =
  'h-10 w-full rounded-xl bg-neutral-800 text-center font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-neutral-600 focus:ring-2 focus:ring-green-500';

export const SET_TYPE_COLOR: Record<SetType, string> = {
  normal: 'text-neutral-100',
  warmup: 'text-yellow-400',
  drop: 'text-blue-400',
  failure: 'text-red-500',
};

export function formatPrevious(p: SetValues | undefined) {
  if (!p || p.reps === null) return '—';
  return p.weightKg ? `${formatWeight(p.weightKg)} kg × ${p.reps}` : `${p.reps} reps`;
}

/**
 * One row of the set table: SET · PREVIOUS · KG · REPS · ✓.
 * Inputs hold a draft only while focused, so DB reloads never clobber typing.
 * Swipe left to reveal Delete.
 */
export default function SetRow({
  set,
  label,
  previous,
  shaking,
  onLabel,
  onToggle,
}: {
  set: WorkoutSet;
  label: string;
  previous: SetValues | undefined;
  shaking: boolean;
  onLabel: () => void;
  onToggle: () => void;
}) {
  const [weightDraft, setWeightDraft] = useState<string | null>(null);
  const [repsDraft, setRepsDraft] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const touchX = useRef<number | null>(null);

  const done = !!set.completed;

  return (
    <div className="relative overflow-hidden">
      <button
        className="absolute inset-y-1 right-0 flex w-20 items-center justify-center rounded-xl bg-red-600"
        onClick={() => deleteSet(set.id)}
        tabIndex={offset ? 0 : -1}
        aria-label="Delete set"
      >
        <Icon name="delete" />
      </button>
      <div
        className={`${SET_GRID} relative my-1 rounded-xl p-0.5 transition-[transform,background-color] ${
          done ? 'bg-green-950' : 'bg-neutral-900'
        } ${shaking ? 'shake' : ''}`}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={(e) => (touchX.current = e.touches[0]!.clientX)}
        onTouchMove={(e) => {
          if (touchX.current === null) return;
          const dx = e.touches[0]!.clientX - touchX.current;
          if (dx < -40) setOffset(-80);
          else if (dx > 20) setOffset(0);
        }}
        onTouchEnd={() => (touchX.current = null)}
      >
        <button className={`h-10 rounded-xl bg-neutral-800 font-bold ${SET_TYPE_COLOR[set.setType]}`} onClick={onLabel}>
          {label}
        </button>
        <span className="truncate text-center text-sm text-neutral-500">{formatPrevious(previous)}</span>
        <input
          className={field}
          inputMode="decimal"
          placeholder={previous?.weightKg != null ? formatWeight(previous.weightKg) : ''}
          value={weightDraft ?? fmt(set.weightKg)}
          onFocus={(e) => {
            setWeightDraft(e.target.value);
            e.target.select();
          }}
          onBlur={() => setWeightDraft(null)}
          onChange={(e) => {
            setWeightDraft(e.target.value);
            const v = parseWeight(e.target.value);
            if (v !== set.weightKg) void updateSetValue(set.id, 'weight_kg', v);
          }}
        />
        <input
          className={field}
          inputMode="numeric"
          placeholder={previous?.reps != null ? String(previous.reps) : ''}
          value={repsDraft ?? fmt(set.reps)}
          onFocus={(e) => {
            setRepsDraft(e.target.value);
            e.target.select();
          }}
          onBlur={() => setRepsDraft(null)}
          onChange={(e) => {
            setRepsDraft(e.target.value);
            const v = parseReps(e.target.value);
            if (v !== set.reps) void updateSetValue(set.id, 'reps', v);
          }}
        />
        <button
          className={`flex h-10 items-center justify-center rounded-xl transition ${
            done ? 'bg-green-500 text-neutral-950' : 'bg-neutral-800 text-neutral-500'
          }`}
          onClick={onToggle}
          aria-label={done ? 'Mark not done' : 'Mark done'}
        >
          <Icon name="check" className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
