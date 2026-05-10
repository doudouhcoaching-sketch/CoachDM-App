// ═══════════════════════════════════════════════════════════════════════════
// COACH DM · Phase 4 · Shared types — Recovery
// ═══════════════════════════════════════════════════════════════════════════

export type SleepSource = 'manual' | 'healthkit' | 'google_fit';

export interface SleepSession {
  id: string;
  user_id: string;
  sleep_date: string;          // YYYY-MM-DD
  bedtime: string;             // ISO
  wake_time: string;           // ISO
  duration_min: number;        // calculé côté DB
  quality: 1 | 2 | 3 | 4 | 5 | null;
  hrv_rmssd_ms: number | null;
  deep_min: number | null;
  rem_min: number | null;
  light_min: number | null;
  awake_min: number | null;
  source: SleepSource;
  external_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SleepSessionInput {
  sleep_date: string;
  bedtime: string;
  wake_time: string;
  quality?: 1 | 2 | 3 | 4 | 5;
  hrv_rmssd_ms?: number;
  deep_min?: number;
  rem_min?: number;
  light_min?: number;
  awake_min?: number;
  source?: SleepSource;
  external_id?: string;
  notes?: string;
}

// ─── Hydratation ────────────────────────────────────────────────────────────

export interface HydrationTarget {
  user_id: string;
  target_ml: number;
  reminder_enabled: boolean;
  reminder_start: string;      // HH:MM:SS
  reminder_end: string;
  reminder_interval_min: number;
  timezone: string;
  updated_at: string;
}

export interface HydrationEntry {
  id: string;
  user_id: string;
  amount_ml: number;
  drank_at: string;
  drank_date: string;
  source: 'manual' | 'quick_add' | 'healthkit' | 'google_fit';
  external_id: string | null;
  created_at: string;
}

export interface HydrationDaily {
  user_id: string;
  drank_date: string;
  total_ml: number;
  entries_count: number;
  first_drink: string;
  last_drink: string;
}

// ─── Habits ─────────────────────────────────────────────────────────────────

export type HabitCategory =
  | 'meditation'
  | 'stretching'
  | 'mobility'
  | 'journaling'
  | 'breathwork'
  | 'cold_exposure'
  | 'sauna'
  | 'reading'
  | 'walking'
  | 'custom';

export type HabitFrequency = 'daily' | 'weekly' | 'custom';

export interface Habit {
  id: string;
  user_id: string;
  category: HabitCategory;
  name: string | null;
  color: string;
  icon: string | null;
  frequency: HabitFrequency;
  active_days: number[];       // 1=Lun..7=Dim
  target_minutes: number | null;
  reminder_time: string | null;
  reminder_enabled: boolean;
  archived: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface HabitInput {
  category: HabitCategory;
  name?: string;
  color?: string;
  icon?: string;
  frequency?: HabitFrequency;
  active_days?: number[];
  target_minutes?: number;
  reminder_time?: string;
  reminder_enabled?: boolean;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  log_date: string;
  done_at: string;
  duration_min: number | null;
  notes: string | null;
  created_at: string;
}

// ─── Streaks & Badges ───────────────────────────────────────────────────────

export interface RecoveryStreaks {
  user_id: string;
  sleep_current: number;
  sleep_best: number;
  sleep_last_date: string | null;
  hydration_current: number;
  hydration_best: number;
  hydration_last_date: string | null;
  habits_current: number;
  habits_best: number;
  habits_last_date: string | null;
  recovery_score: number | null;
  score_updated_at: string | null;
  updated_at: string;
}

export type BadgeKind =
  | 'sleep_7d' | 'sleep_30d' | 'sleep_100d'
  | 'hydration_7d' | 'hydration_30d' | 'hydration_100d'
  | 'habits_7d' | 'habits_30d' | 'habits_100d'
  | 'recovery_score_80' | 'recovery_score_95'
  | 'first_week_complete';

export interface RecoveryBadge {
  id: string;
  user_id: string;
  kind: BadgeKind;
  unlocked_at: string;
}

// ─── Insights (smart tips) ──────────────────────────────────────────────────

export type InsightLevel = 'insight' | 'warning' | 'info' | 'tactic';

export interface RecoveryInsight {
  level: InsightLevel;
  title: string;
  message: string;
  source?: string;             // ref scientifique (Mah 2011, etc.)
}
