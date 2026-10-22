import { seedImages } from './exerciseImages';
import { seedSql } from './seed';

// Ordered list; running migrations[i] brings the DB to PRAGMA user_version = i + 1.
// Never edit an applied migration — append a new one.
export const migrations: string[] = [
  `
  CREATE TABLE exercise (
    id            INTEGER PRIMARY KEY,
    name          TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    muscle_group  TEXT    NOT NULL,
    equipment     TEXT    NOT NULL,
    is_custom     INTEGER NOT NULL DEFAULT 0,
    archived      INTEGER NOT NULL DEFAULT 0,
    rest_seconds  INTEGER NOT NULL DEFAULT 120 CHECK (rest_seconds >= 0)
  );

  CREATE TABLE workout (
    id            INTEGER PRIMARY KEY,
    title         TEXT NOT NULL,
    date          TEXT NOT NULL,
    started_at    TEXT NOT NULL,
    finished_at   TEXT,
    notes         TEXT,
    rest_ends_at  TEXT
  );
  CREATE INDEX idx_workout_date ON workout(date);
  CREATE UNIQUE INDEX idx_workout_one_active ON workout((1)) WHERE finished_at IS NULL;

  CREATE TABLE workout_exercise (
    id           INTEGER PRIMARY KEY,
    workout_id   INTEGER NOT NULL REFERENCES workout(id) ON DELETE CASCADE,
    exercise_id  INTEGER NOT NULL REFERENCES exercise(id),
    position     INTEGER NOT NULL
  );
  CREATE INDEX idx_we_workout  ON workout_exercise(workout_id);
  CREATE INDEX idx_we_exercise ON workout_exercise(exercise_id);

  CREATE TABLE workout_set (
    id                   INTEGER PRIMARY KEY,
    workout_exercise_id  INTEGER NOT NULL REFERENCES workout_exercise(id) ON DELETE CASCADE,
    position             INTEGER NOT NULL,
    set_type             TEXT    NOT NULL DEFAULT 'normal'
                           CHECK (set_type IN ('normal','warmup','drop','failure')),
    weight_kg            REAL    CHECK (weight_kg >= 0),
    reps                 INTEGER CHECK (reps > 0),
    completed            INTEGER NOT NULL DEFAULT 0,
    CHECK (completed = 0 OR (weight_kg IS NOT NULL AND reps IS NOT NULL))
  );
  CREATE INDEX idx_set_we ON workout_set(workout_exercise_id);

  CREATE TABLE plan_version (
    id              INTEGER PRIMARY KEY,
    effective_from  TEXT NOT NULL UNIQUE
  );

  CREATE TABLE plan_day (
    plan_version_id  INTEGER NOT NULL REFERENCES plan_version(id) ON DELETE CASCADE,
    weekday          INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
    PRIMARY KEY (plan_version_id, weekday)
  );

  CREATE TABLE skip (
    date    TEXT PRIMARY KEY,
    reason  TEXT NOT NULL CHECK (reason IN
             ('sick','injury','tired','no_time','travel','chose_not_to','other')),
    note    TEXT
  );

  CREATE TABLE meta (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
  );

  ${seedSql}
  `,
  // 2: favourites (Exercises tab section)
  `ALTER TABLE exercise ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0;`,
  // 3: exercise picture — a bundled photo path for seed exercises, or a JPEG data URL for
  // a user's own photo (kept in the DB so backups include it).
  `ALTER TABLE exercise ADD COLUMN image TEXT;
  ${seedImages
    .map(([name, slug]) => `UPDATE exercise SET image = '/exercises/${slug}.jpg' WHERE name = '${name}' AND is_custom = 0;`)
    .join('\n  ')}`,
  // 4: grip selector — which exercises offer it, and the grip used per logged exercise.
  `ALTER TABLE exercise ADD COLUMN has_grip INTEGER NOT NULL DEFAULT 0;
  UPDATE exercise SET has_grip = 1 WHERE is_custom = 0 AND name IN
    ('Lat Pulldown', 'Seated Cable Row', 'T-Bar Row', 'Pull-Up');
  ALTER TABLE workout_exercise ADD COLUMN grip TEXT
    CHECK (grip IN ('wide', 'normal', 'narrow', 'parallel_wide', 'parallel_normal'));`,
  // 5: default rest timer (Settings). rest_custom = 1 once an exercise's rest was set in a
  // workout; only non-custom exercises follow the default. Anything already changed from the
  // old built-in 120 s counts as custom.
  `ALTER TABLE exercise ADD COLUMN rest_custom INTEGER NOT NULL DEFAULT 0;
  UPDATE exercise SET rest_custom = 1 WHERE rest_seconds <> 120;
  INSERT INTO meta (key, value) VALUES ('default_rest_seconds', '120') ON CONFLICT DO NOTHING;`,
];
