import { useState } from 'react';
import { btn, input } from '../../components/Sheet';
import { useDbQuery } from '../../hooks/useDbQuery';
import { label, listExercises, MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '../../repositories/exercises';

/** Search + muscle-group filter over the exercise library. Used by the Exercises tab and the picker. */
export default function ExerciseList({
  archived = false,
  selected,
  onPick,
}: {
  archived?: boolean;
  selected?: Set<number>;
  onPick: (e: Exercise) => void;
}) {
  const all = useDbQuery(() => listExercises(archived), [archived]);
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);

  const q = search.trim().toLowerCase();
  const shown = (all ?? []).filter(
    (e) => (!muscle || e.muscleGroup === muscle) && (!q || e.name.toLowerCase().includes(q)),
  );

  return (
    <div className="flex flex-col gap-3">
      <input
        className={input}
        placeholder="Search exercises"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        type="search"
      />
      <div className="-mx-4 flex shrink-0 gap-2 overflow-x-auto px-4 pb-1">
        <button className={btn.chip(muscle === null)} onClick={() => setMuscle(null)}>
          All
        </button>
        {MUSCLE_GROUPS.map((m) => (
          <button key={m} className={btn.chip(muscle === m)} onClick={() => setMuscle(muscle === m ? null : m)}>
            {label(m)}
          </button>
        ))}
      </div>
      <ul className="divide-y divide-neutral-800">
        {shown.map((e) => (
          <li key={e.id}>
            <button className="flex w-full items-center justify-between py-3 text-left" onClick={() => onPick(e)}>
              <span>
                <span className="block font-medium">{e.name}</span>
                <span className="text-sm text-neutral-400">
                  {label(e.muscleGroup)} · {label(e.equipment)}
                  {e.isCustom ? ' · Custom' : ''}
                </span>
              </span>
              {selected?.has(e.id) && <span className="text-xl text-green-500">✓</span>}
            </button>
          </li>
        ))}
        {all && shown.length === 0 && <li className="py-6 text-center text-neutral-500">No exercises found</li>}
      </ul>
    </div>
  );
}
