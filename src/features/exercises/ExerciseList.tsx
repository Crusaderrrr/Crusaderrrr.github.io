import { useState } from 'react';
import ExerciseThumb from '../../components/ExerciseThumb';
import { btn, input } from '../../components/Sheet';
import { useDbQuery } from '../../hooks/useDbQuery';
import {
  label,
  listExercises,
  MUSCLE_GROUPS,
  setFavorite,
  type Exercise,
  type MuscleGroup,
} from '../../repositories/exercises';

/**
 * Search + muscle-group filter over the exercise library, with a Favourites section on top.
 * Used by the Exercises tab and the workout picker.
 */
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
  const favorites = shown.filter((e) => e.favorite);

  const row = (e: Exercise) => (
    <li key={e.id} className="flex items-center gap-3">
      <button className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left" onClick={() => onPick(e)}>
        <ExerciseThumb image={e.image} muscleGroup={e.muscleGroup} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{e.name}</span>
          <span className="text-sm text-neutral-400">
            {label(e.muscleGroup)} · {label(e.equipment)}
            {e.isCustom ? ' · Custom' : ''}
          </span>
        </span>
        {selected?.has(e.id) && <span className="text-xl text-green-500">✓</span>}
      </button>
      <button
        className={`px-1 text-xl ${e.favorite ? 'text-yellow-400' : 'text-neutral-600'}`}
        onClick={() => setFavorite(e.id, !e.favorite)}
        aria-label={e.favorite ? 'Remove from favourites' : 'Add to favourites'}
      >
        {e.favorite ? '★' : '☆'}
      </button>
    </li>
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
      <div className="-mx-4 flex shrink-0 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <button className={btn.chip(muscle === null)} onClick={() => setMuscle(null)}>
          All
        </button>
        {MUSCLE_GROUPS.map((m) => (
          <button key={m} className={btn.chip(muscle === m)} onClick={() => setMuscle(muscle === m ? null : m)}>
            {label(m)}
          </button>
        ))}
      </div>
      {favorites.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-400 uppercase">Favourites</h2>
          <ul className="divide-y divide-neutral-800">{favorites.map(row)}</ul>
          <h2 className="mt-4 text-sm font-semibold text-neutral-400 uppercase">All exercises</h2>
        </section>
      )}
      <ul className="divide-y divide-neutral-800">
        {shown.map(row)}
        {all && shown.length === 0 && <li className="py-6 text-center text-neutral-500">No exercises found</li>}
      </ul>
    </div>
  );
}
