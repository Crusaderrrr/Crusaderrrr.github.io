import { Link, Navigate, Route, Routes, useLocation } from 'react-router';
import Icon from './components/Icon';
import TabBar from './components/TabBar';
import { formatClock } from './domain/workout';
import { useDbQuery, useNow } from './hooks/useDbQuery';
import { getActiveWorkout } from './repositories/workouts';
import TodayScreen from './features/today/TodayScreen';
import HistoryScreen from './features/history/HistoryScreen';
import { EditWorkoutScreen, WorkoutDetailScreen } from './features/history/WorkoutDetailScreen';
import CalendarScreen from './features/calendar/CalendarScreen';
import PlanScreen from './features/calendar/PlanScreen';
import ExercisesScreen from './features/exercises/ExercisesScreen';
import ExerciseProgressScreen from './features/progress/ExerciseProgressScreen';
import SettingsScreen from './features/settings/SettingsScreen';
import ActiveWorkoutScreen from './features/workout/ActiveWorkoutScreen';

export default function App() {
  const { pathname } = useLocation();
  // The logging screens are full-screen, like Hevy.
  const fullScreen = pathname === '/workout' || pathname.endsWith('/edit');

  return (
    <div className={`flex h-full flex-col ${fullScreen ? '' : 'pt-[env(safe-area-inset-top)]'}`}>
      {/* Logging screens manage their own scrolling (fixed header + scrolling body). */}
      <main className={fullScreen ? 'min-h-0 flex-1' : 'scroll-area min-h-0 flex-1 px-4 pt-3 pb-6'}>
        <Routes>
          <Route path="/" element={<TodayScreen />} />
          <Route path="/workout" element={<ActiveWorkoutScreen />} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="/history/:id" element={<WorkoutDetailScreen />} />
          <Route path="/history/:id/edit" element={<EditWorkoutScreen />} />
          <Route path="/calendar" element={<CalendarScreen />} />
          <Route path="/plan" element={<PlanScreen />} />
          <Route path="/exercises" element={<ExercisesScreen />} />
          <Route path="/exercises/:id" element={<ExerciseProgressScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!fullScreen && (
        <>
          <ActiveWorkoutBar />
          <TabBar />
        </>
      )}
    </div>
  );
}

/** Mini-bar above the tabs while a workout is in progress. */
function ActiveWorkoutBar() {
  const active = useDbQuery(getActiveWorkout, []);
  const now = useNow();
  if (!active) return null;
  return (
    <Link
      to="/workout"
      className="mx-3 mb-2 flex shrink-0 items-center gap-3 rounded-2xl bg-green-500 px-4 py-2.5 text-neutral-950 shadow-lg shadow-black/40"
    >
      <Icon name="dumbbell" className="h-5 w-5" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{active.title}</span>
        <span className="text-xs font-medium opacity-75">Workout in progress</span>
      </span>
      <span className="font-semibold tabular-nums">{formatClock((now - Date.parse(active.startedAt)) / 1000)}</span>
      <Icon name="chevronRight" className="h-5 w-5" />
    </Link>
  );
}
