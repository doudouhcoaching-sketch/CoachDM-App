// packages/shared/src/workouts/types.ts
// COACH DM — Types partagés workouts (Phase 2)

export type WorkoutGoal =
  | 'fat_loss'
  | 'strength'
  | 'functional'
  | 'sport'
  | 'travel_home'
  | 'mobility'
  | 'custom';

export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'horizontal_push'
  | 'horizontal_pull'
  | 'vertical_push'
  | 'vertical_pull'
  | 'carry'
  | 'rotation'
  | 'core'
  | 'gait'
  | 'jump'
  | 'olympic'
  | 'gymnastics'
  | 'mobility';

export type ExerciseModality =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'resistance_band'
  | 'sled'
  | 'rower'
  | 'bike'
  | 'ski_erg'
  | 'run'
  | 'medball'
  | 'box'
  | 'rings'
  | 'pull_up_bar'
  | 'sandbag'
  | 'wall_ball';

export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'rx';

export type SetType =
  | 'work'
  | 'warmup'
  | 'amrap'
  | 'emom'
  | 'tabata'
  | 'cluster'
  | 'drop'
  | 'pyramid'
  | 'metcon'
  | 'time';

export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'skipped';

export type TipColor = 'green' | 'red' | 'blue' | 'violet';

// ===========================================================================
// CATALOG
// ===========================================================================

export interface Exercise {
  id: string;
  slug: string;
  name_fr: string;
  name_en: string;
  name_nl: string;
  pattern: MovementPattern;
  modality: ExerciseModality;
  difficulty: ExerciseDifficulty;
  primary_muscles: string[];
  secondary_muscles: string[];
  goals: WorkoutGoal[];
  cues_fr: string;
  cues_en: string;
  cues_nl: string;
  tip_color: TipColor;
  tip_fr: string | null;
  tip_en: string | null;
  tip_nl: string | null;
  reference_citation: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  default_tempo: string | null;
  is_unilateral: boolean;
  requires_spotter: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Program {
  id: string;
  slug: string;
  title_fr: string;
  title_en: string;
  title_nl: string;
  goal: WorkoutGoal;
  duration_weeks: number;
  sessions_per_week: number;
  description_fr: string | null;
  description_en: string | null;
  description_nl: string | null;
  cover_image_url: string | null;
  difficulty: ExerciseDifficulty;
  is_recommended: boolean;
  is_premium: boolean;
  payhip_url: string | null;
  display_order: number;
  created_at: string;
}

export interface Workout {
  id: string;
  program_id: string | null;
  week_number: number | null;
  day_number: number | null;
  title_fr: string;
  title_en: string;
  title_nl: string;
  focus: string | null;
  estimated_duration_min: number;
  intro_fr: string | null;
  intro_en: string | null;
  intro_nl: string | null;
  is_template: boolean;
  created_at: string;
}

export type WorkoutBlock = 'warmup' | 'main' | 'accessory' | 'metcon' | 'cooldown';

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  block: WorkoutBlock;
  position: number;
  prescribed_sets: number;
  prescribed_reps: string | null;
  prescribed_rpe: number | null;
  prescribed_weight_pct_1rm: number | null;
  prescribed_rest_sec: number;
  set_type: SetType;
  notes_fr: string | null;
  notes_en: string | null;
  notes_nl: string | null;
  superset_group: string | null;
}

// Joined view for player UI
export interface WorkoutExerciseFull extends WorkoutExercise {
  exercise: Exercise;
}

export interface WorkoutFull extends Workout {
  exercises: WorkoutExerciseFull[];
}

// ===========================================================================
// USER STATE
// ===========================================================================

export interface UserProgramEnrollment {
  id: string;
  user_id: string;
  program_id: string;
  start_date: string;
  current_week: number;
  current_day: number;
  is_active: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  workout_id: string | null;
  enrollment_id: string | null;
  started_at: string;
  ended_at: string | null;
  status: SessionStatus;
  rpe_overall: number | null;
  notes: string | null;
  duration_sec: number | null;
}

export interface SetLog {
  id: string;
  session_id: string;
  workout_exercise_id: string | null;
  exercise_id: string;
  set_number: number;
  set_type: SetType;
  reps: number | null;
  weight_kg: number | null;
  duration_sec: number | null;
  distance_m: number | null;
  rpe: number | null;
  rir: number | null;
  rest_sec: number | null;
  is_pr: boolean;
  notes: string | null;
}

export interface ExercisePersonalRecord {
  id: string;
  user_id: string;
  exercise_id: string;
  best_1rm_kg: number | null;
  best_5rm_kg: number | null;
  best_10rm_kg: number | null;
  best_volume_kg: number | null;
  best_duration_sec: number | null;
  best_distance_m: number | null;
  achieved_at: string;
}

// ===========================================================================
// I18N HELPERS
// ===========================================================================

export type Locale = 'fr' | 'en' | 'nl';

export function exerciseName(ex: Exercise, locale: Locale): string {
  return locale === 'fr' ? ex.name_fr : locale === 'en' ? ex.name_en : ex.name_nl;
}

export function exerciseCues(ex: Exercise, locale: Locale): string {
  return locale === 'fr' ? ex.cues_fr : locale === 'en' ? ex.cues_en : ex.cues_nl;
}

export function exerciseTip(ex: Exercise, locale: Locale): string | null {
  return locale === 'fr' ? ex.tip_fr : locale === 'en' ? ex.tip_en : ex.tip_nl;
}

export function programTitle(p: Program, locale: Locale): string {
  return locale === 'fr' ? p.title_fr : locale === 'en' ? p.title_en : p.title_nl;
}

export function workoutTitle(w: Workout, locale: Locale): string {
  return locale === 'fr' ? w.title_fr : locale === 'en' ? w.title_en : w.title_nl;
}

export function workoutExerciseNotes(we: WorkoutExercise, locale: Locale): string | null {
  return locale === 'fr' ? we.notes_fr : locale === 'en' ? we.notes_en : we.notes_nl;
}

// ===========================================================================
// 1RM / VOLUME UTILS
// ===========================================================================

/** Epley formula: 1RM = weight × (1 + reps / 30) */
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps < 1 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/** Brzycki formula (more accurate for low reps): 1RM = weight / (1.0278 - 0.0278 × reps) */
export function brzycki1RM(weightKg: number, reps: number): number {
  if (reps < 1 || reps >= 36 || weightKg <= 0) return 0;
  return Math.round((weightKg / (1.0278 - 0.0278 * reps)) * 10) / 10;
}

/** Average Epley + Brzycki for best estimate */
export function best1RMEstimate(weightKg: number, reps: number): number {
  if (reps === 1) return weightKg;
  const e = estimate1RM(weightKg, reps);
  const b = brzycki1RM(weightKg, reps);
  return Math.round(((e + b) / 2) * 10) / 10;
}

/** Total tonnage for a list of sets */
export function sessionVolumeKg(sets: Pick<SetLog, 'reps' | 'weight_kg'>[]): number {
  return sets.reduce((acc, s) => {
    if (s.reps == null || s.weight_kg == null) return acc;
    return acc + s.reps * s.weight_kg;
  }, 0);
}

/** Compute target weight from %1RM */
export function pctTo1RM(oneRMKg: number, pct: number): number {
  return Math.round(oneRMKg * (pct / 100) * 2) / 2; // round to 0.5 kg
}
