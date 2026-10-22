import { useRef, useState } from 'react';
import Icon from '../../components/Icon';
import { card, PageHeader, Row, SectionTitle } from '../../components/ui';
import { useDbQuery } from '../../hooks/useDbQuery';
import { countExercises, getMeta } from '../../repositories/meta';
import { backupOverdue, exportBackup, importBackup, lastBackupAt } from './backup';

export default function SettingsScreen() {
  const info = useDbQuery(async () => {
    const [meta, exercises, persisted] = await Promise.all([
      getMeta(),
      countExercises(),
      navigator.storage?.persisted?.() ?? false,
    ]);
    return { launches: meta.launch_count ?? '0', exercises, persisted };
  }, []);
  const [last, setLast] = useState(lastBackupAt);
  const [message, setMessage] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

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

  const overdue = backupOverdue();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Settings" />

      <section className="flex flex-col gap-2">
        <SectionTitle>Backup</SectionTitle>
        {overdue && (
          <p className="flex items-start gap-2 rounded-2xl bg-amber-500/10 p-3 text-sm text-amber-300 ring-1 ring-amber-500/30">
            <Icon name="warning" className="mt-0.5 h-4 w-4" />
            Your data lives only on this phone. Export a backup regularly.
          </p>
        )}
        <div className={`${card} divide-y divide-white/[0.06] overflow-hidden`}>
          <Row icon="download" iconBg="bg-green-600" title="Export database" onClick={doExport} chevron />
          <Row icon="upload" iconBg="bg-sky-600" title="Import database" onClick={() => fileInput.current?.click()} chevron />
          <Row
            icon="history"
            iconBg="bg-neutral-600"
            title="Last backup"
            detail={
              <span className={overdue ? 'text-amber-300' : ''}>
                {last ? new Date(last).toLocaleDateString('en-GB') : 'Never'}
              </span>
            }
          />
        </div>
        <input
          ref={fileInput}
          type="file"
          className="hidden"
          onChange={(e) => {
            void doImport(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {message && <p className="px-1 text-sm text-neutral-300">{message}</p>}
      </section>

      <section className="flex flex-col gap-2">
        <SectionTitle>About</SectionTitle>
        <div className={`${card} divide-y divide-white/[0.06] overflow-hidden`}>
          <Row
            icon="database"
            iconBg="bg-violet-600"
            title="Persistent storage"
            detail={info ? (info.persisted ? 'Yes' : 'No') : ''}
          />
          <Row icon="dumbbell" iconBg="bg-orange-600" title="Exercises" detail={info ? String(info.exercises) : ''} />
          <Row icon="play" iconBg="bg-neutral-600" title="App launches" detail={info?.launches ?? ''} />
          <Row icon="settings" iconBg="bg-neutral-600" title="Build" detail={new Date(__BUILD_TIME__).toLocaleString('en-GB')} />
        </div>
        <p className="px-1 text-xs text-neutral-500">
          Trust The Process · Exercise photos: free-exercise-db (public domain) · Icons: Material Symbols
        </p>
      </section>
    </div>
  );
}
