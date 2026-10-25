import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

// Reads a v1 backup (.sqlite3) into the JSON that POST /api/import takes. The file is opened in
// memory and never migrated, so older backups are read as they are: columns added by later v1
// migrations default when missing. Workouts refer to exercises by name, v1 ids stay local.

type Row = Record<string, unknown>;

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const flag = (v: unknown): number => (v ? 1 : 0);

const LATEST_V1_SCHEMA = 7; // PRAGMA user_version of the last v1 migration

function checkHeader(bytes: Uint8Array) {
  // The SQLite header is "SQLite format 3\0"; user_version sits at offset 60.
  if (new TextDecoder().decode(bytes.subarray(0, 16)) !== 'SQLite format 3\0') throw new Error('Not a SQLite database file.');
  const fileVersion = new DataView(bytes.buffer, bytes.byteOffset).getUint32(60);
  if (fileVersion < 1) throw new Error('This file is not a TTP backup.');
  if (fileVersion > LATEST_V1_SCHEMA) throw new Error('Backup is from a newer app version — update the app first.');
}

async function convert(bytes: Uint8Array) {
  checkHeader(bytes);
  const sqlite3 = await sqlite3InitModule();
  const db = new sqlite3.oo1.DB(':memory:');
  try {
    const ptr = sqlite3.wasm.allocFromTypedArray(bytes);
    db.checkRc(
      sqlite3.capi.sqlite3_deserialize(
        db.pointer!,
        'main',
        ptr,
        bytes.length,
        bytes.length,
        sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE | sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE,
      ),
    );
    const all = (sql: string) => db.selectObjects(sql) as Row[];

    const exercises = all('SELECT * FROM exercise');
    const nameOf = new Map(exercises.map((e) => [Number(e.id), String(e.name)]));
    const meta = Object.fromEntries(all('SELECT key, value FROM meta').map((m) => [String(m.key), String(m.value)]));

    const setsByWe = Map.groupBy(all('SELECT * FROM workout_set ORDER BY position, id'), (s) => Number(s.workout_exercise_id));
    const weByWorkout = Map.groupBy(all('SELECT * FROM workout_exercise ORDER BY position, id'), (e) => Number(e.workout_id));
    const days = Map.groupBy(all('SELECT * FROM plan_day'), (d) => Number(d.plan_version_id));

    return {
      defaultRestSeconds: meta.default_rest_seconds ? Number(meta.default_rest_seconds) : null,
      exercises: exercises.map((e) => ({
        name: String(e.name),
        muscleGroup: String(e.muscle_group),
        equipment: String(e.equipment),
        isCustom: flag(e.is_custom),
        archived: flag(e.archived),
        restSeconds: Number(e.rest_seconds ?? 120),
        restCustom: flag(e.rest_custom),
        favorite: flag(e.favorite),
        image: (e.image as string | null) ?? null,
        hasGrip: flag(e.has_grip),
        isCardio: flag(e.is_cardio),
      })),
      workouts: all('SELECT * FROM workout ORDER BY date, started_at').map((w) => ({
        id: Number(w.id),
        title: String(w.title),
        date: String(w.date),
        startedAt: String(w.started_at),
        finishedAt: (w.finished_at as string | null) ?? null,
        notes: (w.notes as string | null) || null,
        restEndsAt: (w.rest_ends_at as string | null) ?? null,
        exercises: (weByWorkout.get(Number(w.id)) ?? []).map((e) => ({
          id: Number(e.id),
          exerciseName: nameOf.get(Number(e.exercise_id)) ?? '',
          position: Number(e.position),
          grip: (e.grip as string | null) ?? null,
          note: (e.note as string | null) || null,
          sets: (setsByWe.get(Number(e.id)) ?? []).map((s) => ({
            id: Number(s.id),
            position: Number(s.position),
            setType: String(s.set_type),
            weightKg: num(s.weight_kg),
            reps: num(s.reps),
            speedKmh: num(s.speed_kmh),
            inclinePct: num(s.incline_pct),
            completed: flag(s.completed),
            autoFill: Number(s.auto_fill ?? 0),
          })),
        })),
      })),
      plan: all('SELECT * FROM plan_version ORDER BY effective_from').map((p) => ({
        effectiveFrom: String(p.effective_from),
        weekdays: (days.get(Number(p.id)) ?? []).map((d) => Number(d.weekday)),
      })),
      skips: all('SELECT * FROM skip ORDER BY date').map((s) => ({
        date: String(s.date),
        reason: String(s.reason),
        note: (s.note as string | null) || null,
      })),
    };
  } finally {
    db.close();
  }
}

onmessage = async ({ data }: MessageEvent<Uint8Array>) => {
  try {
    postMessage({ ok: true, payload: await convert(data) });
  } catch (e) {
    postMessage({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
};
