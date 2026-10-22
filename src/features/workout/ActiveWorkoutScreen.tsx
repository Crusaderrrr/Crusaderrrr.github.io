import { Link } from 'react-router';
import { useDbQuery } from '../../hooks/useDbQuery';
import { getActiveWorkout, getWorkout } from '../../repositories/workouts';
import WorkoutEditor from './WorkoutEditor';

export default function ActiveWorkoutScreen() {
  const workout = useDbQuery(async () => {
    const active = await getActiveWorkout();
    return active ? getWorkout(active.id) : null;
  }, []);

  if (workout === undefined) return null;
  // No auto-redirect here: finishing/discarding navigates itself, and a redirect would race it.
  if (workout === null) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-neutral-400">
        No workout in progress.
        <Link to="/" className="text-green-500">
          Go to Today
        </Link>
      </div>
    );
  }
  return <WorkoutEditor workout={workout} mode="active" />;
}
