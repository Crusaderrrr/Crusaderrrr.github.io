-- Grip selector per exercise becomes a grip set: which list of grips it offers.
ALTER TABLE exercise ADD COLUMN grip_set text CHECK (grip_set IN ('back', 'triceps'));
UPDATE exercise SET grip_set = 'back' WHERE has_grip;
UPDATE exercise SET grip_set = 'triceps'
  WHERE NOT is_custom AND name IN ('Triceps Pushdown', 'Overhead Triceps Extension');
ALTER TABLE exercise DROP COLUMN has_grip;

ALTER TABLE workout_exercise DROP CONSTRAINT workout_exercise_grip_check;
ALTER TABLE workout_exercise ADD CONSTRAINT workout_exercise_grip_check CHECK (grip IN
  ('wide', 'normal', 'narrow', 'parallel_wide', 'parallel_normal', 'rope', 'v_bar', 'straight_bar'));
