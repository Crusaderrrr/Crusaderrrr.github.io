import { useState } from 'react';
import { useNavigate } from 'react-router';
import ExerciseList from './ExerciseList';
import NewExerciseSheet from './NewExerciseSheet';

export default function ExercisesScreen() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [archived, setArchived] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{archived ? 'Archived' : 'Exercises'}</h1>
        <button className="text-green-500" onClick={() => setCreating(true)}>
          + New
        </button>
      </div>
      <ExerciseList archived={archived} onPick={(e) => navigate(`/exercises/${e.id}`)} />
      <button className="py-4 text-sm text-neutral-500" onClick={() => setArchived(!archived)}>
        {archived ? '← Back to exercises' : 'Show archived exercises'}
      </button>
      {creating && <NewExerciseSheet onClose={() => setCreating(false)} />}
    </div>
  );
}
