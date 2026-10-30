import type { Sql, Tx } from './db.js';

// The exercise library every new account starts with (copied per user, so favourites, rest, grip,
// photo and archive state stay per account). Photos live in public/exercises/<slug>.jpg.
// [name, muscle group, equipment, photo slug, grip set]
const LIBRARY: [string, string, string, string, ('back' | 'triceps')?][] = [
  ['Barbell Bench Press', 'chest', 'barbell', 'barbell-bench-press'],
  ['Incline Barbell Bench Press', 'chest', 'barbell', 'incline-barbell-bench-press'],
  ['Dumbbell Bench Press', 'chest', 'dumbbell', 'dumbbell-bench-press'],
  ['Incline Dumbbell Press', 'chest', 'dumbbell', 'incline-dumbbell-press'],
  ['Dumbbell Fly', 'chest', 'dumbbell', 'dumbbell-fly'],
  ['Cable Crossover', 'chest', 'cable', 'cable-crossover'],
  ['Chest Press Machine', 'chest', 'machine', 'chest-press-machine'],
  ['Push-Up', 'chest', 'bodyweight', 'push-up'],
  ['Dip', 'chest', 'bodyweight', 'dip'],
  ['Deadlift', 'back', 'barbell', 'deadlift'],
  ['Barbell Row', 'back', 'barbell', 'barbell-row'],
  ['Dumbbell Row', 'back', 'dumbbell', 'dumbbell-row'],
  ['Pull-Up', 'back', 'bodyweight', 'pull-up', 'back'],
  ['Chin-Up', 'back', 'bodyweight', 'chin-up'],
  ['Lat Pulldown', 'back', 'cable', 'lat-pulldown', 'back'],
  ['Seated Cable Row', 'back', 'cable', 'seated-cable-row', 'back'],
  ['T-Bar Row', 'back', 'barbell', 't-bar-row', 'back'],
  ['Face Pull', 'shoulders', 'cable', 'face-pull'],
  ['Overhead Press', 'shoulders', 'barbell', 'overhead-press'],
  ['Seated Dumbbell Shoulder Press', 'shoulders', 'dumbbell', 'seated-dumbbell-shoulder-press'],
  ['Lateral Raise', 'shoulders', 'dumbbell', 'lateral-raise'],
  ['Cable Lateral Raise', 'shoulders', 'cable', 'cable-lateral-raise'],
  ['Rear Delt Fly', 'shoulders', 'dumbbell', 'rear-delt-fly'],
  ['Shrug', 'shoulders', 'dumbbell', 'shrug'],
  ['Barbell Curl', 'biceps', 'barbell', 'barbell-curl'],
  ['Dumbbell Curl', 'biceps', 'dumbbell', 'dumbbell-curl'],
  ['Hammer Curl', 'biceps', 'dumbbell', 'hammer-curl'],
  ['Preacher Curl', 'biceps', 'machine', 'preacher-curl'],
  ['Cable Curl', 'biceps', 'cable', 'cable-curl'],
  ['Triceps Pushdown', 'triceps', 'cable', 'triceps-pushdown', 'triceps'],
  ['Overhead Triceps Extension', 'triceps', 'cable', 'overhead-triceps-extension', 'triceps'],
  ['Skull Crusher', 'triceps', 'barbell', 'skull-crusher'],
  ['Close-Grip Bench Press', 'triceps', 'barbell', 'close-grip-bench-press'],
  ['Back Squat', 'legs', 'barbell', 'back-squat'],
  ['Front Squat', 'legs', 'barbell', 'front-squat'],
  ['Leg Press', 'legs', 'machine', 'leg-press'],
  ['Romanian Deadlift', 'legs', 'barbell', 'romanian-deadlift'],
  ['Bulgarian Split Squat', 'legs', 'dumbbell', 'bulgarian-split-squat'],
  ['Walking Lunge', 'legs', 'dumbbell', 'walking-lunge'],
  ['Leg Extension', 'legs', 'machine', 'leg-extension'],
  ['Lying Leg Curl', 'legs', 'machine', 'lying-leg-curl'],
  ['Seated Leg Curl', 'legs', 'machine', 'seated-leg-curl'],
  ['Standing Calf Raise', 'legs', 'machine', 'standing-calf-raise'],
  ['Seated Calf Raise', 'legs', 'machine', 'seated-calf-raise'],
  ['Hip Thrust', 'glutes', 'barbell', 'hip-thrust'],
  ['Cable Kickback', 'glutes', 'cable', 'cable-kickback'],
  ['Hip Abduction Machine', 'glutes', 'machine', 'hip-abduction-machine'],
  ['Plank', 'core', 'bodyweight', 'plank'],
  ['Hanging Leg Raise', 'core', 'bodyweight', 'hanging-leg-raise'],
  ['Cable Crunch', 'core', 'cable', 'cable-crunch'],
  ['Ab Wheel Rollout', 'core', 'other', 'ab-wheel-rollout'],
  ['Kettlebell Swing', 'full_body', 'kettlebell', 'kettlebell-swing'],
];

export const DEFAULT_REST_SECONDS = 120;

export async function seedExercises(tx: Sql | Tx, userId: number | string): Promise<void> {
  const rows = LIBRARY.map(([name, muscle_group, equipment, slug, gripSet]) => ({
    user_id: userId,
    name,
    muscle_group,
    equipment,
    image: `/exercises/${slug}.jpg`,
    grip_set: gripSet ?? null,
    rest_seconds: DEFAULT_REST_SECONDS,
  }));
  await tx`INSERT INTO exercise ${tx(rows, 'user_id', 'name', 'muscle_group', 'equipment', 'image', 'grip_set', 'rest_seconds')}`;
  // Cardio: sets log time / speed / incline; rest timer off by default.
  await tx`INSERT INTO exercise (user_id, name, muscle_group, equipment, is_cardio, rest_seconds, rest_custom)
           VALUES (${userId}, 'Treadmill', 'cardio', 'machine', true, 0, true)`;
}
