import { useState } from 'react';
import ExerciseThumb from '../../components/ExerciseThumb';
import Icon from '../../components/Icon';
import Sheet from '../../components/Sheet';
import { btn, input, SectionTitle } from '../../components/ui';
import {
  createExercise,
  EQUIPMENT,
  GRIP_SET_NAMES,
  GRIP_SETS,
  label,
  MUSCLE_GROUPS,
  type Equipment,
  type GripSet,
  type MuscleGroup,
} from '../../repositories/exercises';
import { photoToDataUrl } from './photo';

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
  const [gripSet, setGripSet] = useState<GripSet | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState('');

  const save = async () => {
    try {
      const id = await createExercise({ name, muscleGroup, equipment, image, gripSet: muscleGroup === 'cardio' ? null : gripSet });
      onCreated?.(id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Sheet title="New exercise" onClose={onClose}>
      <div className="flex flex-col gap-4 pb-2">
        <div className="flex items-center gap-3">
          <label className="shrink-0" aria-label="Add photo">
            {image ? (
              <ExerciseThumb image={image} muscleGroup={muscleGroup} size={56} />
            ) : (
              <span className="flex h-14 w-14 flex-col items-center justify-center rounded-xl bg-neutral-800 text-[10px] text-neutral-400">
                <Icon name="camera" className="h-6 w-6" />
                Photo
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) setImage(await photoToDataUrl(file));
              }}
            />
          </label>
          <input className={input} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <SectionTitle>Muscle group</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map((m) => (
              <button key={m} className={btn.chip(m === muscleGroup)} onClick={() => setMuscleGroup(m)}>
                {label(m)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <SectionTitle>Equipment</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map((m) => (
              <button key={m} className={btn.chip(m === equipment)} onClick={() => setEquipment(m)}>
                {label(m)}
              </button>
            ))}
          </div>
        </div>
        {muscleGroup !== 'cardio' && (
          <div className="flex items-center gap-3 rounded-xl bg-neutral-800/60 px-3 py-2.5">
            <Icon name="grip" className="h-5 w-5 text-neutral-400" />
            <span className="flex-1 text-sm">Grips</span>
            <GripSetPicker value={gripSet} onChange={setGripSet} />
          </div>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className={btn.primary} disabled={!name.trim()} onClick={save}>
          <Icon name="save" />
          Save
        </button>
      </div>
    </Sheet>
  );
}

/** Off / Back (wide, narrow, parallel…) / Triceps (rope, V-bar…): which grips an exercise offers. */
export function GripSetPicker({ value, onChange }: { value: GripSet | null; onChange: (v: GripSet | null) => void }) {
  const options: [GripSet | null, string][] = [
    [null, 'Off'],
    ...(Object.keys(GRIP_SETS) as GripSet[]).map((s): [GripSet, string] => [s, GRIP_SET_NAMES[s]]),
  ];
  return (
    <div className="flex gap-1.5">
      {options.map(([s, name]) => (
        <button key={name} className={btn.chip(value === s)} onClick={() => onChange(s)}>
          {name}
        </button>
      ))}
    </div>
  );
}
