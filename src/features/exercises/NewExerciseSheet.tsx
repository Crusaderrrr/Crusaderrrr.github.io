import { useState } from 'react';
import Sheet, { btn, input } from '../../components/Sheet';
import {
  createExercise,
  EQUIPMENT,
  label,
  MUSCLE_GROUPS,
  type Equipment,
  type MuscleGroup,
} from '../../repositories/exercises';

export default function NewExerciseSheet({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: (id: number) => void;
}) {
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('chest');
  const [equipment, setEquipment] = useState<Equipment>('barbell');
  const [error, setError] = useState('');

  const save = async () => {
    try {
      const id = await createExercise({ name, muscleGroup, equipment });
      onCreated?.(id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Sheet title="New exercise" onClose={onClose}>
      <div className="flex flex-col gap-4 pb-2">
        <input className={input} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <div>
          <p className="mb-2 text-sm text-neutral-400">Muscle group</p>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map((m) => (
              <button key={m} className={btn.chip(m === muscleGroup)} onClick={() => setMuscleGroup(m)}>
                {label(m)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm text-neutral-400">Equipment</p>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map((m) => (
              <button key={m} className={btn.chip(m === equipment)} onClick={() => setEquipment(m)}>
                {label(m)}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className={btn.primary} disabled={!name.trim()} onClick={save}>
          Save
        </button>
      </div>
    </Sheet>
  );
}
