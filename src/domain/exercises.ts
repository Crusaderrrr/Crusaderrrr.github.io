export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'legs',
  'glutes',
  'core',
  'full_body',
] as const;
export const EQUIPMENT = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'other'] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export type Equipment = (typeof EQUIPMENT)[number];

export const GRIPS = ['wide', 'normal', 'narrow', 'parallel_wide', 'parallel_normal'] as const;
export type Grip = (typeof GRIPS)[number];
export const GRIP_NAMES: Record<Grip, string> = {
  wide: 'Wide',
  normal: 'Normal',
  narrow: 'Narrow',
  parallel_wide: 'Parallel wide',
  parallel_normal: 'Parallel normal',
};

export const label = (s: string) => (s === 'full_body' ? 'Full body' : s[0]!.toUpperCase() + s.slice(1));

export type Exercise = {
  id: number;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  isCustom: number;
  archived: number;
  restSeconds: number;
  /** 1 = rest set in a workout; 0 = follows the default from Settings. */
  restCustom: number;
  favorite: number;
  /** Bundled photo path or JPEG data URL; null → muscle-group icon. */
  image: string | null;
  /** Offers the grip selector when logged (lat pulldown, rows…). */
  hasGrip: number;
  /** Logs time / speed / incline instead of kg / reps (treadmill). */
  isCardio: number;
  /** Grip used the last time this exercise was logged (grip exercises only). */
  lastGrip: Grip | null;
};
