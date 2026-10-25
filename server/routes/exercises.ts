import { z } from 'zod';
import type { Sql } from '../db.js';
import { previousSets } from '../previous.js';
import { DATE_RE, EQUIPMENT, GRIPS, isUniqueViolation, MUSCLE_GROUPS, parseBody, privateRouter, userId } from './util.js';

type ExerciseRow = {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string;
  is_custom: boolean;
  archived: boolean;
  rest_seconds: number;
  favorite: boolean;
  image: string | null;
  has_grip: boolean;
  is_cardio: boolean;
};

const COLS =
  'id, name, muscle_group, equipment, is_custom, archived, rest_seconds, favorite, image, has_grip, is_cardio';

// Flags go out as 0 / 1, the shape the app has always used for them.
export const exerciseJson = (r: ExerciseRow) => ({
  id: Number(r.id),
  name: r.name,
  muscleGroup: r.muscle_group,
  equipment: r.equipment,
  isCustom: +r.is_custom,
  archived: +r.archived,
  restSeconds: r.rest_seconds,
  favorite: +r.favorite,
  image: r.image,
  hasGrip: +r.has_grip,
  isCardio: +r.is_cardio,
});

const createBody = z.object({
  name: z.string().trim().min(1).max(80),
  muscleGroup: z.enum(MUSCLE_GROUPS),
  equipment: z.enum(EQUIPMENT),
  image: z.string().startsWith('data:image/').nullable(),
  hasGrip: z.boolean(),
});

const patchBody = z.object({
  favorite: z.boolean().optional(),
  hasGrip: z.boolean().optional(),
  archived: z.boolean().optional(),
  image: z.string().startsWith('data:image/').nullable().optional(),
  // A number pins the rest for this exercise; null makes it follow the default again.
  restSeconds: z.number().int().min(0).max(3600).nullable().optional(),
});

const previousQuery = z.object({
  grip: z.enum(GRIPS).optional(),
  date: z.string().regex(DATE_RE),
  startedAt: z.iso.datetime(),
  excludeWorkoutId: z.uuid().optional(),
});

export function exerciseRoutes(sql: Sql) {
  const app = privateRouter(sql);

  app.get('/', async (c) => {
    const rows = await sql<ExerciseRow[]>`
      SELECT ${sql.unsafe(COLS)} FROM exercise
      WHERE user_id = ${userId(c)} AND archived = ${c.req.query('archived') === '1'}
      ORDER BY lower(name)`;
    return c.json(rows.map(exerciseJson));
  });

  app.post('/', async (c) => {
    const { data, error } = await parseBody(c, createBody);
    if (error) return error;
    try {
      const rows = await sql<ExerciseRow[]>`
        INSERT INTO exercise (user_id, name, muscle_group, equipment, is_custom, image, has_grip, rest_seconds)
        VALUES (${userId(c)}, ${data.name}, ${data.muscleGroup}, ${data.equipment}, true, ${data.image}, ${data.hasGrip},
                COALESCE((SELECT default_rest_seconds FROM user_settings WHERE user_id = ${userId(c)}), 120))
        RETURNING ${sql.unsafe(COLS)}`;
      return c.json(exerciseJson(rows[0]!), 201);
    } catch (e) {
      if (isUniqueViolation(e)) {
        return c.json({ error: 'duplicate', message: `"${data.name}" already exists (it may be archived).` }, 409);
      }
      throw e;
    }
  });

  app.get('/:id{[0-9]+}', async (c) => {
    const rows = await sql<ExerciseRow[]>`
      SELECT ${sql.unsafe(COLS)} FROM exercise WHERE id = ${c.req.param('id')} AND user_id = ${userId(c)}`;
    return rows[0] ? c.json(exerciseJson(rows[0])) : c.json({ error: 'not_found' }, 404);
  });

  app.patch('/:id{[0-9]+}', async (c) => {
    const { data, error } = await parseBody(c, patchBody);
    if (error) return error;
    const id = c.req.param('id');
    const uid = userId(c);
    const found = await sql.begin(async (tx) => {
      const own = await tx`SELECT 1 FROM exercise WHERE id = ${id} AND user_id = ${uid} FOR UPDATE`;
      if (!own.length) return false;
      const plain = {
        ...(data.favorite !== undefined && { favorite: data.favorite }),
        ...(data.hasGrip !== undefined && { has_grip: data.hasGrip }),
        ...(data.archived !== undefined && { archived: data.archived }),
        ...(data.image !== undefined && { image: data.image }),
      };
      if (Object.keys(plain).length) await tx`UPDATE exercise SET ${tx(plain)} WHERE id = ${id}`;
      if (typeof data.restSeconds === 'number') {
        await tx`UPDATE exercise SET rest_seconds = ${data.restSeconds}, rest_custom = true WHERE id = ${id}`;
      } else if (data.restSeconds === null) {
        await tx`UPDATE exercise SET rest_custom = false,
                   rest_seconds = COALESCE((SELECT default_rest_seconds FROM user_settings WHERE user_id = ${uid}), 120)
                 WHERE id = ${id}`;
      }
      return true;
    });
    if (!found) return c.json({ error: 'not_found' }, 404);
    const rows = await sql<ExerciseRow[]>`SELECT ${sql.unsafe(COLS)} FROM exercise WHERE id = ${id}`;
    return c.json(exerciseJson(rows[0]!));
  });

  /** Custom exercises without history are deleted; anything with history is archived. */
  app.delete('/:id{[0-9]+}', async (c) => {
    const id = c.req.param('id');
    const uid = userId(c);
    const result = await sql.begin(async (tx) => {
      const rows = await tx<{ is_custom: boolean }[]>`
        SELECT is_custom FROM exercise WHERE id = ${id} AND user_id = ${uid} FOR UPDATE`;
      if (!rows[0]) return null;
      const used = await tx`SELECT 1 FROM workout_exercise WHERE exercise_id = ${id} LIMIT 1`;
      if (rows[0].is_custom && !used.length) {
        await tx`DELETE FROM exercise WHERE id = ${id}`;
        return 'deleted' as const;
      }
      await tx`UPDATE exercise SET archived = true WHERE id = ${id}`;
      return 'archived' as const;
    });
    return result ? c.json({ result }) : c.json({ error: 'not_found' }, 404);
  });

  /** Completed sets of the latest earlier finished workout with this exercise (and grip). */
  app.get('/:id{[0-9]+}/previous', async (c) => {
    const parsed = previousQuery.safeParse(c.req.query());
    if (!parsed.success) return c.json({ error: 'invalid_input', message: 'Invalid query.' }, 400);
    const q = parsed.data;
    const sets = await previousSets(sql, userId(c), Number(c.req.param('id')), q.grip ?? null, {
      date: q.date,
      startedAt: q.startedAt,
      excludeWorkoutId: q.excludeWorkoutId ?? null,
    });
    return c.json(sets);
  });

  return app;
}
