import { exportDb, importDb } from '../../repositories/backup';
import { today } from '../../domain/dates';

// Kept in localStorage, not the DB: an exported file would otherwise carry a stale date and an
// import would overwrite it (SPEC §6.7).
const KEY = 'ttp.lastBackupAt';
const NUDGE_DAYS = 14;

export function lastBackupAt(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function backupOverdue(): boolean {
  const t = lastBackupAt();
  return !t || Date.now() - Date.parse(t) > NUDGE_DAYS * 86_400_000;
}

/** Share sheet on iOS (save to Files, AirDrop…), download link elsewhere. False if cancelled. */
export async function exportBackup(): Promise<boolean> {
  const bytes = (await exportDb()) as Uint8Array<ArrayBuffer>;
  const file = new File([bytes], `ttp-${today()}.sqlite3`, { type: 'application/octet-stream' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return false;
      throw e;
    }
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  }
  try {
    localStorage.setItem(KEY, new Date().toISOString());
  } catch {
    /* storage unavailable; nudge will just keep showing */
  }
  return true;
}

export async function importBackup(file: File): Promise<void> {
  await importDb(new Uint8Array(await file.arrayBuffer()));
}
