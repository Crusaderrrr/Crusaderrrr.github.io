import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { Sql } from '../db.js';
import { DATE_RE, EQUIPMENT, GRIPS, MUSCLE_GROUPS, parseBody, privateRouter, SET_TYPES, SKIP_REASONS, userId } from './util.js';

// Imports a v1 backup (MIGRATION.md §9, phase 11). The browser reads the .sqlite3 file and posts it
// here as JSON, with v1's integer ids. Workout / exercise / set ids become UUIDs derived from
// (account, v1 id), so importing the same file twice replaces the first import instead of doubling it.

const flag = z.number().int().min(0).max(1);
const time = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Bad timestamp');

const bodySchema = z.object({
  defaultRestSeconds: z.number().int().min(0).max(3600).nullable(),
  exercises: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        muscleGroup: z.enum(MUSCLE_GROUPS),
        equipment: z.enum(EQUIPMENT),
        isCustom: flag,
        archived: flag,
        restSeconds: z.number().int().min(0).max(3600),
        restCustom: flag,
        favorite: flag,
        image: z.string().nullable(),
        hasGrip: flag,
        isCardio: flag,
      }),
    )
    .max(2000),
  workouts: z
    .array(
      z.object({
        id: z.number().int(),
        title: z.string().trim().min(1).max(200),
        date: z.string().regex(DATE_RE),
        startedAt: time,
        finishedAt: time.nullable(),
        notes: z.string().max(5000).nullable(),
        restEndsAt: time.nullable(),
        exercises: z
          .array(
            z.object({
              id: z.number().int(),
              exerciseName: z.string(), // v1 ids are meaningless here; the exercise is found by name
              position: z.number().int().min(0),
              grip: z.enum(GRIPS).nullable(),
              note: z.string().max(500).nullable(),
              sets: z
                .array(
                  z.object({
                    id: z.number().int(),
                    position: z.number().int().min(0),
                    setType: z.enum(SET_TYPES),
                    weightKg: z.number().min(0).nullable(),
                    reps: z.number().int().min(1).nullable(),
                    speedKmh: z.number().min(0).nullable(),
                    inclinePct: z.number().min(0).nullable(),
                    completed: flag,
                    autoFill: z.number().int().min(0).max(3),
                  }),
                )
                .max(200),
            }),
          )
          .max(100),
      }),
    )
    .max(20_000),
  plan: z.array(z.object({ effectiveFrom: z.string().regex(DATE_RE), weekdays: z.array(z.number().int().min(1).max(7)).max(7) })).max(1000),
  skips: z.array(z.object({ date: z.string().regex(DATE_RE), reason: z.enum(SKIP_REASONS), note: z.string().max(500).nullable() })).max(20_000),
});
type Body = z.infer<typeof bodySchema>;

/** Stable UUID for (account, kind, v1 id). */
function derivedId(uid: number, kind: string, v1Id: number): string {
  const h = createHash('sha256').update(`ttp-import:${uid}:${kind}:${v1Id}`).digest();
  h[6] = (h[6]! & 0x0f) | 0x50; // version 5 layout
  h[8] = (h[8]! & 0x3f) | 0x80; // RFC 4122 variant
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

const CHUNK = 1000; // keeps one INSERT well under Postgres' 65k-parameter limit

async function insertChunked<T extends Record<string, unknown>>(
  rows: T[],
  insert: (chunk: T[]) => PromiseLike<unknown>,
) {
  for (let i = 0; i < rows.length; i += CHUNK) await insert(rows.slice(i, i + CHUNK));
}

async function importAll(sql: Sql, uid: number, b: Body) {
  return sql.begin(async (tx) => {
    if (b.defaultRestSeconds !== null) {
      await tx`
        INSERT INTO user_settings (user_id, default_rest_seconds) VALUES (${uid}, ${b.defaultRestSeconds})
        ON CONFLICT (user_id) DO UPDATE SET default_rest_seconds = excluded.default_rest_seconds`;
    }

    // Exercises: the account already has the seed library, so match by name and carry over the
    // user's settings; anything else (custom exercises) is created. Bundled photo paths are kept
    // as the account has them; only a user's own photo (a data URL) replaces the image.
    const existing = await tx<{ id: string; name: string }[]>`SELECT id, name FROM exercise WHERE user_id = ${uid}`;
    const byName = new Map(existing.map((e) => [e.name.toLowerCase(), Number(e.id)]));
    let exercisesCreated = 0;
    for (const e of b.exercises) {
      const id = byName.get(e.name.toLowerCase());
      const photo = e.image?.startsWith('data:image/') ? e.image : null;
      if (id) {
        await tx`
          UPDATE exercise SET favorite = ${!!e.favorite}, archived = ${!!e.archived}, rest_seconds = ${e.restSeconds},
            rest_custom = ${!!e.restCustom}, has_grip = ${!!e.hasGrip}, image = COALESCE(${photo}, image)
          WHERE id = ${id} AND user_id = ${uid}`;
      } else {
        const [row] = await tx<{ id: string }[]>`
          INSERT INTO exercise (user_id, name, muscle_group, equipment, is_custom, archived, rest_seconds, rest_custom,
                                favorite, image, has_grip, is_cardio)
          VALUES (${uid}, ${e.name}, ${e.muscleGroup}, ${e.equipment}, ${!!e.isCustom}, ${!!e.archived}, ${e.restSeconds},
                  ${!!e.restCustom}, ${!!e.favorite}, ${e.image}, ${!!e.hasGrip}, ${!!e.isCardio}) RETURNING id`;
        byName.set(e.name.toLowerCase(), Number(row!.id));
        exercisesCreated++;
      }
    }

    // Workouts: replace any earlier import of the same v1 rows.
    const ids = b.workouts.map((w) => derivedId(uid, 'workout', w.id));
    if (ids.length) await tx`DELETE FROM workout WHERE user_id = ${uid} AND id IN ${tx(ids)}`;
    // An unfinished v1 workout cannot be imported next to the account's own unfinished one.
    const [active] = await tx`SELECT 1 FROM workout WHERE user_id = ${uid} AND finished_at IS NULL`;
    const todo = b.workouts.filter((w) => w.finishedAt || !active);
    const skippedActive = b.workouts.length - todo.length;

    const workoutRows: Record<string, unknown>[] = [];
    const exerciseRows: Record<string, unknown>[] = [];
    const setRows: Record<string, unknown>[] = [];
    for (const w of todo) {
      const wid = derivedId(uid, 'workout', w.id);
      workoutRows.push({
        id: wid,
        user_id: uid,
        title: w.title,
        date: w.date,
        started_at: new Date(w.startedAt),
        finished_at: w.finishedAt && new Date(w.finishedAt),
        notes: w.notes,
        rest_ends_at: w.restEndsAt && new Date(w.restEndsAt),
      });
      for (const e of w.exercises) {
        const exerciseId = byName.get(e.exerciseName.toLowerCase());
        if (!exerciseId) throw new Error(`Unknown exercise "${e.exerciseName}"`);
        const weid = derivedId(uid, 'workout_exercise', e.id);
        exerciseRows.push({ id: weid, workout_id: wid, exercise_id: exerciseId, position: e.position, grip: e.grip, note: e.note });
        for (const s of e.sets) {
          setRows.push({
            id: derivedId(uid, 'workout_set', s.id),
            workout_exercise_id: weid,
            position: s.position,
            set_type: s.setType,
            weight_kg: s.weightKg,
            reps: s.reps,
            speed_kmh: s.speedKmh,
            incline_pct: s.inclinePct,
            completed: !!s.completed,
            auto_fill: s.autoFill,
          });
        }
      }
    }
    await insertChunked(workoutRows, (c) => tx`INSERT INTO workout ${tx(c)}`);
    await insertChunked(exerciseRows, (c) => tx`INSERT INTO workout_exercise ${tx(c)}`);
    await insertChunked(setRows, (c) => tx`INSERT INTO workout_set ${tx(c)}`);

    for (const p of b.plan) {
      const [v] = await tx<{ id: string }[]>`
        INSERT INTO plan_version (user_id, effective_from) VALUES (${uid}, ${p.effectiveFrom})
        ON CONFLICT (user_id, effective_from) DO UPDATE SET effective_from = excluded.effective_from RETURNING id`;
      await tx`DELETE FROM plan_day WHERE plan_version_id = ${v!.id}`;
      const days = [...new Set(p.weekdays)].map((weekday) => ({ plan_version_id: v!.id, weekday }));
      if (days.length) await tx`INSERT INTO plan_day ${tx(days)}`;
    }

    await insertChunked(
      b.skips.map((s) => ({ user_id: uid, date: s.date, reason: s.reason, note: s.note })),
      (c) => tx`
        INSERT INTO skip ${tx(c)}
        ON CONFLICT (user_id, date) DO UPDATE SET reason = excluded.reason, note = excluded.note`,
    );

    return {
      workouts: todo.length,
      skippedActive,
      exercisesCreated,
      plans: b.plan.length,
      skips: b.skips.length,
    };
  });
}

export function importRoutes(sql: Sql) {
  const app = privateRouter(sql);

  app.post('/', async (c) => {
    const { data, error } = await parseBody(c, bodySchema);
    if (error) return error;
    try {
      return c.json(await importAll(sql, userId(c), data));
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Unknown exercise')) {
        return c.json({ error: 'invalid_input', message: e.message }, 400);
      }
      throw e;
    }
  });

  return app;
}
