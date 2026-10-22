import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { dbReady } from './db/client';
import TabBar from './components/TabBar';
import TodayScreen from './features/today/TodayScreen';
import HistoryScreen from './features/history/HistoryScreen';
import CalendarScreen from './features/calendar/CalendarScreen';
import ExercisesScreen from './features/exercises/ExercisesScreen';
import SettingsScreen from './features/settings/SettingsScreen';

type DbState = { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

export default function App() {
  const [db, setDb] = useState<DbState>({ status: 'loading' });

  useEffect(() => {
    dbReady.then(
      () => setDb({ status: 'ready' }),
      (e: unknown) => setDb({ status: 'error', message: String(e) }),
    );
  }, []);

  if (db.status === 'loading') return null;
  if (db.status === 'error') return <DbErrorScreen message={db.message} />;

  return (
    <div className="flex h-full flex-col pt-[env(safe-area-inset-top)]">
      <main className="flex-1 overflow-y-auto px-4 py-4">
        <Routes>
          <Route path="/" element={<TodayScreen />} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="/calendar" element={<CalendarScreen />} />
          <Route path="/exercises" element={<ExercisesScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  );
}

// opfs-sahpool allows one instance per origin; a second tab/window fails to open the DB.
function DbErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">Can't open your data</h1>
      <p className="text-neutral-400">
        TTP is probably open somewhere else (another tab or window). Close it and reopen the app.
      </p>
      <p className="break-all text-xs text-neutral-600">{message}</p>
      <button
        className="rounded-lg bg-green-600 px-4 py-2 font-medium"
        onClick={() => location.reload()}
      >
        Retry
      </button>
    </div>
  );
}
