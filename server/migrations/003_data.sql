-- Workout data (MIGRATION.md §5). Every row is owned by a user; every query filters by user_id
-- (directly, or through workout / exercise). Calendar dates stay 'YYYY-MM-DD' text, exactly as in v1,
-- so no timezone conversion can shift a day.

CREATE TABLE exercise (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      bigint  NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  name         text    NOT NULL,
  muscle_group text    NOT NULL,
  equipment    text    NOT NULL,
  is_custom    boolean NOT NULL DEFAULT false,
  archived     boolean NOT NULL DEFAULT false,
  rest_seconds integer NOT NULL DEFAULT 120 CHECK (rest_seconds >= 0),
  -- true once the rest was set in a workout; only the others follow the default from settings
  rest_custom  boolean NOT NULL DEFAULT false,
  favorite     boolean NOT NULL DEFAULT false,
  -- bundled photo path, or a JPEG data URL for the user's own photo
  image        text,
  has_grip     boolean NOT NULL DEFAULT false,
  -- cardio sets log time (in reps), speed and incline instead of kg / reps
  is_cardio    boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX exercise_user_name_key ON exercise (user_id, lower(name));

CREATE TABLE workout (
  id           uuid PRIMARY KEY,
  user_id      bigint NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  title        text   NOT NULL,
  date         text   NOT NULL CHECK (date ~ '^\d{4}-\d{2}-\d{2}$'),
  started_at   timestamptz NOT NULL,
  finished_at  timestamptz,
  notes        text,
  rest_ends_at timestamptz
);
CREATE INDEX workout_user_date_idx ON workout (user_id, date);
-- One unfinished workout per user.
CREATE UNIQUE INDEX workout_one_active_idx ON workout (user_id) WHERE finished_at IS NULL;

CREATE TABLE workout_exercise (
  id          uuid PRIMARY KEY,
  workout_id  uuid   NOT NULL REFERENCES workout(id) ON DELETE CASCADE,
  exercise_id bigint NOT NULL REFERENCES exercise(id),
  position    integer NOT NULL,
  grip        text CHECK (grip IN ('wide', 'normal', 'narrow', 'parallel_wide', 'parallel_normal')),
  note        text
);
CREATE INDEX workout_exercise_workout_idx ON workout_exercise (workout_id);
CREATE INDEX workout_exercise_exercise_idx ON workout_exercise (exercise_id);

CREATE TABLE workout_set (
  id                  uuid PRIMARY KEY,
  workout_exercise_id uuid NOT NULL REFERENCES workout_exercise(id) ON DELETE CASCADE,
  position            integer NOT NULL,
  set_type            text NOT NULL DEFAULT 'normal' CHECK (set_type IN ('normal', 'warmup', 'drop', 'failure')),
  weight_kg           double precision CHECK (weight_kg >= 0),
  reps                integer CHECK (reps > 0),
  speed_kmh           double precision CHECK (speed_kmh >= 0),
  incline_pct         double precision CHECK (incline_pct >= 0),
  completed           boolean NOT NULL DEFAULT false,
  -- bit 1 = weight, bit 2 = reps: copied from an earlier set rather than typed here
  auto_fill           integer NOT NULL DEFAULT 0,
  CHECK (NOT completed OR (weight_kg IS NOT NULL AND reps IS NOT NULL))
);
CREATE INDEX workout_set_we_idx ON workout_set (workout_exercise_id);

CREATE TABLE plan_version (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id        bigint NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  effective_from text   NOT NULL CHECK (effective_from ~ '^\d{4}-\d{2}-\d{2}$'),
  UNIQUE (user_id, effective_from)
);

CREATE TABLE plan_day (
  plan_version_id bigint  NOT NULL REFERENCES plan_version(id) ON DELETE CASCADE,
  weekday         integer NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  PRIMARY KEY (plan_version_id, weekday)
);

CREATE TABLE skip (
  user_id bigint NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  date    text   NOT NULL CHECK (date ~ '^\d{4}-\d{2}-\d{2}$'),
  reason  text   NOT NULL CHECK (reason IN ('sick', 'injury', 'tired', 'no_time', 'travel', 'chose_not_to', 'other')),
  note    text,
  PRIMARY KEY (user_id, date)
);
