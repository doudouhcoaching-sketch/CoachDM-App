// =====================================================================
// Coach DM · Phase 5 · Shared types
// =====================================================================

export type Locale = 'fr' | 'en' | 'nl';

// ---------------------------------------------------------------------
// Body metrics
// ---------------------------------------------------------------------
export type BodyMetricSource = 'manual' | 'healthkit' | 'google_fit' | 'smart_scale';

export interface BodyMetric {
  id: string;
  user_id: string;
  measured_at: string; // ISO
  measured_date: string; // YYYY-MM-DD
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  water_pct: number | null;
  neck_cm: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  biceps_left_cm: number | null;
  biceps_right_cm: number | null;
  thigh_left_cm: number | null;
  thigh_right_cm: number | null;
  calf_left_cm: number | null;
  calf_right_cm: number | null;
  source: BodyMetricSource;
  external_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BodyMetricsWeekly {
  user_id: string;
  week_start: string;
  avg_weight_kg: number | null;
  min_weight_kg: number | null;
  max_weight_kg: number | null;
  avg_body_fat_pct: number | null;
  avg_waist_cm: number | null;
  weight_entries: number;
}

// ---------------------------------------------------------------------
// Personal records
// ---------------------------------------------------------------------
export type PRCategory =
  | 'strength_1rm'
  | 'strength_volume'
  | 'cardio_distance'
  | 'cardio_duration'
  | 'cardio_pace'
  | 'cardio_hr_avg'
  | 'body_weight_min'
  | 'body_weight_max'
  | 'body_fat_min';

export type PRCalcMethod = 'actual' | 'epley' | 'brzycki';

export interface PersonalRecord {
  id: string;
  user_id: string;
  category: PRCategory;
  exercise_id: string | null;
  exercise_name: string | null;
  activity_type: string | null;
  value: number;
  unit: string;
  achieved_at: string;
  achieved_date: string;
  source_log_id: string | null;
  source_table: string | null;
  calc_method: PRCalcMethod | null;
  reps: number | null;
  load_kg: number | null;
  previous_value: number | null;
  delta_pct: number | null;
  created_at: string;
}

// ---------------------------------------------------------------------
// Cardio logs
// ---------------------------------------------------------------------
export type CardioActivityType =
  | 'running' | 'cycling' | 'swimming' | 'rowing'
  | 'walking' | 'hiking' | 'elliptical' | 'other';

export interface CardioLog {
  id: string;
  user_id: string;
  activity_type: CardioActivityType;
  started_at: string;
  duration_s: number;
  distance_m: number | null;
  avg_hr_bpm: number | null;
  max_hr_bpm: number | null;
  calories_kcal: number | null;
  rpe: number | null;
  source: string;
  external_id: string | null;
  notes: string | null;
  logged_date: string;
  created_at: string;
}

// ---------------------------------------------------------------------
// Activity calendar
// ---------------------------------------------------------------------
export interface DailyActivity {
  user_id: string;
  day: string; // YYYY-MM-DD
  workout_count: number;
  workout_minutes: number;
  cardio_count: number;
  cardio_minutes: number;
  habits_done: number;
  hydra_ml: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

// ---------------------------------------------------------------------
// Progress photos
// ---------------------------------------------------------------------
export type PhotoPose = 'front' | 'side_left' | 'side_right' | 'back' | 'custom';

export interface ProgressPhoto {
  id: string;
  user_id: string;
  pose: PhotoPose;
  storage_path: string;
  thumbnail_path: string | null;
  taken_at: string;
  taken_date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  notes: string | null;
  visible_to_coach: boolean;
  created_at: string;
  deleted_at: string | null;
}

export interface PhotoComparison {
  id: string;
  user_id: string;
  before_photo_id: string;
  after_photo_id: string;
  title: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------
// Insights (réutilise le pattern Phase 4)
// ---------------------------------------------------------------------
export type InsightKind = 'insight' | 'warning' | 'info' | 'tactic';

export interface ProgressionInsight {
  kind: InsightKind;
  icon: '✓' | '✗' | 'ⓘ' | '⚑';
  title: { fr: string; en: string; nl: string };
  body: { fr: string; en: string; nl: string };
  source?: string; // ex: "Helms 2014"
}

// ---------------------------------------------------------------------
// Plateau detection
// ---------------------------------------------------------------------
export interface PlateauDetection {
  is_plateau: boolean;
  weeks_stagnant: number;
  avg_weight_first_window: number | null;
  avg_weight_last_window: number | null;
  delta_kg: number | null;
  delta_pct: number | null;
  recommendation: ProgressionInsight | null;
}
