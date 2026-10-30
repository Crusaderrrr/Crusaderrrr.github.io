-- Optional mood marks: a rating (and what influenced it) after a workout, a rating on a skipped day.
ALTER TABLE workout
  ADD COLUMN rating text CHECK (rating IN ('good', 'okay', 'bad')),
  ADD COLUMN feelings text[] NOT NULL DEFAULT '{}';
ALTER TABLE skip ADD COLUMN rating text CHECK (rating IN ('good', 'okay', 'bad'));
