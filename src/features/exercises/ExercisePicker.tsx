import { useState } from 'react';
import Sheet, { btn } from '../../components/Sheet';
import ExerciseList from './ExerciseList';
import NewExerciseSheet from './NewExerciseSheet';

/** Multi-select picker (or single-select when replacing an exercise). */
export default function ExercisePicker({
  single = false,
  onDone,
  onClose,
}: {
  single?: boolean;
  onDone: (ids: number[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);

  const toggle = (id: number) => {
    if (single) return onDone([id]);
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  return (
    <Sheet title={single ? 'Replace exercise' : 'Add exercises'} onClose={onClose} full>
      <button className="mb-3 self-start text-sm text-green-500" onClick={() => setCreating(true)}>
        + New exercise
      </button>
      <ExerciseList selected={new Set(selected)} onPick={(e) => toggle(e.id)} />
      {!single && (
        <div className="sticky bottom-0 bg-neutral-900 pt-3">
          <button className={`${btn.primary} w-full`} disabled={!selected.length} onClick={() => onDone(selected)}>
            Add {selected.length || ''} exercise{selected.length === 1 ? '' : 's'}
          </button>
        </div>
      )}
      {creating && <NewExerciseSheet onClose={() => setCreating(false)} onCreated={(id) => toggle(id)} />}
    </Sheet>
  );
}
