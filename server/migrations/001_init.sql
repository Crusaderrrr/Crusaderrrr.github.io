-- Accounts (MIGRATION.md §5). Workout data tables arrive with the API phase.
CREATE TABLE app_user (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username      text NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
-- Case-insensitive uniqueness without the citext extension (extensions are per-schema, awkward in tests).
CREATE UNIQUE INDEX app_user_username_key ON app_user (lower(username));

-- Only the SHA-256 of the cookie token is stored, so a DB leak can't be replayed.
CREATE TABLE session (
  token_hash bytea PRIMARY KEY,
  user_id    bigint NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX session_user_idx ON session (user_id);
CREATE INDEX session_expires_idx ON session (expires_at);

CREATE TABLE invite (
  code       text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_by    bigint REFERENCES app_user(id) ON DELETE SET NULL,
  used_at    timestamptz
);

CREATE TABLE user_settings (
  user_id              bigint PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  default_rest_seconds integer NOT NULL DEFAULT 120
);
