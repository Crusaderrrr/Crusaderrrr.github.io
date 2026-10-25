import { api } from '../api/client';
import { dropCleanDocs } from './workoutStore';

export type ImportResult = { workouts: number; skippedActive: number; exercisesCreated: number; plans: number; skips: number };

/** Reads a v1 backup file in a worker (sqlite-wasm, in memory) and hands it to the server. */
export async function importV1Backup(file: File): Promise<ImportResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const worker = new Worker(new URL('../db/v1reader.worker.ts', import.meta.url), { type: 'module' });
  const payload = await new Promise<unknown>((resolve, reject) => {
    worker.onmessage = ({ data }: MessageEvent<{ ok: true; payload: unknown } | { ok: false; error: string }>) =>
      data.ok ? resolve(data.payload) : reject(new Error(data.error));
    worker.onerror = (e) => reject(new Error(e.message || 'Could not read the backup.'));
    worker.postMessage(bytes);
  }).finally(() => worker.terminate());
  const result = await api<ImportResult>('POST', '/import', payload);
  dropCleanDocs(); // open workout documents may be replaced by the import
  return result;
}
