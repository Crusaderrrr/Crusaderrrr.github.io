import { useState } from 'react';
import { btn } from '../../components/Sheet';
import { useDbQuery } from '../../hooks/useDbQuery';
import { countExercises, getMeta } from '../../repositories/meta';
import { backupOverdue, exportBackup, importBackup, lastBackupAt } from './backup';

export default function SettingsScreen() {
  const info = useDbQuery(
    async () => {
      const [meta, exercises, persisted] = await Promise.all([
        getMeta(),
        countExercises(),
        navigator.storage?.persisted?.() ?? false,
      ]);
      return { launches: meta.launch_count ?? '0', exercises, persisted };
    },
    [],
  );
  const [last, setLast] = useState(lastBackupAt);
  const [message, setMessage] = useState('');

  const doExport = async () => {
    try {
      if (await exportBackup()) {
        setLast(lastBackupAt());
        setMessage('Backup exported.');
      }
    } catch (e) {
      setMessage(`Export failed: ${e instanceof Error ? e.message : e}`);
    }
  };

  const doImport = async (file: File | undefined) => {
    if (!file) return;
    if (!confirm(`Replace ALL data on this phone with "${file.name}"? This cannot be undone.`)) return;
    try {
      await importBackup(file);
      location.reload(); // simplest way to reset every screen to the new data
    } catch (e) {
      setMessage(`Import failed: ${e instanceof Error ? e.message : e}`);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="flex flex-col gap-3 rounded-2xl bg-neutral-900 p-4">
        <h2 className="font-semibold">Backup</h2>
        <p className={`text-sm ${backupOverdue() ? 'text-amber-400' : 'text-neutral-400'}`}>
          Last backup: {last ? new Date(last).toLocaleDateString('en-GB') : 'never'}
          {backupOverdue() && ' — time to back up! Your data lives only on this phone.'}
        </p>
        <button className={btn.primary} onClick={doExport}>
          Export database
        </button>
        <label className={`${btn.secondary} text-center`}>
          Import database
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              void doImport(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        {message && <p className="text-sm text-neutral-300">{message}</p>}
      </section>

      <section className="rounded-2xl bg-neutral-900 p-4">
        <h2 className="mb-2 font-semibold">About</h2>
        {info && (
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-neutral-400">Persistent storage</dt>
            <dd>{info.persisted ? 'Yes' : 'No'}</dd>
            <dt className="text-neutral-400">Exercises</dt>
            <dd>{info.exercises}</dd>
            <dt className="text-neutral-400">App launches</dt>
            <dd>{info.launches}</dd>
            <dt className="text-neutral-400">Build</dt>
            <dd>{new Date(__BUILD_TIME__).toLocaleString('en-GB')}</dd>
          </dl>
        )}
        <p className="mt-3 text-xs text-neutral-500">
          Exercise photos: free-exercise-db (public domain).
        </p>
      </section>
    </div>
  );
}
