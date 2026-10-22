import { useEffect, useState } from 'react';
import { countExercises, getMeta } from '../../repositories/meta';

type Info = { launches: string; firstLaunch: string; exercises: number; persisted: boolean };

export default function SettingsScreen() {
  const [info, setInfo] = useState<Info>();

  useEffect(() => {
    Promise.all([getMeta(), countExercises(), navigator.storage?.persisted?.() ?? false]).then(
      ([meta, exercises, persisted]) =>
        setInfo({
          launches: meta.launch_count ?? '0',
          firstLaunch: meta.first_launch_at ? new Date(meta.first_launch_at).toLocaleString() : '—',
          exercises,
          persisted,
        }),
    );
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <section className="rounded-xl bg-neutral-900 p-4">
        <h2 className="mb-2 font-semibold">Storage</h2>
        {info && (
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-neutral-400">App launches</dt>
            <dd>{info.launches}</dd>
            <dt className="text-neutral-400">First launch</dt>
            <dd>{info.firstLaunch}</dd>
            <dt className="text-neutral-400">Exercises</dt>
            <dd>{info.exercises}</dd>
            <dt className="text-neutral-400">Persistent storage</dt>
            <dd>{info.persisted ? 'Yes' : 'No'}</dd>
          </dl>
        )}
      </section>
    </div>
  );
}
