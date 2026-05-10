// ============================================================
// Coach DM · Shared types · Coach module (Phase 3)
// ============================================================

export type UserRole = 'client' | 'coach' | 'super_admin';

export type CoachSubscriptionStatus =
  | 'trial'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'comp'
  | 'free';

export type CoachClientStatus = 'pending' | 'active' | 'paused' | 'archived';

export type CheckInStatus = 'pending' | 'submitted' | 'reviewed';

export type CheckInFrequency = 'weekly' | 'biweekly' | 'monthly';

export type AssignedPlanStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'completed'
  | 'archived';

export type MessageRefType =
  | 'workout_session'
  | 'check_in'
  | 'food_log'
  | 'weight_log'
  | 'program';

// ─────────────────────────────────────────────────────────────
// Coach profiles & subscriptions
// ─────────────────────────────────────────────────────────────

export interface CoachProfile {
  user_id: string;
  display_name: string;
  bio_fr: string | null;
  bio_en: string | null;
  bio_nl: string | null;
  certifications: string[];
  specialties: string[];
  avatar_url: string | null;
  city: string | null;
  country: string;
  is_active: boolean;
  max_clients: number;
  created_at: string;
  updated_at: string;
}

export interface CoachSubscription {
  id: string;
  coach_user_id: string;
  status: CoachSubscriptionStatus;
  plan: 'coach_pro' | 'coach_pro_annual' | 'comp' | 'free';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  granted_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoachClient {
  id: string;
  coach_user_id: string;
  client_user_id: string;
  status: CoachClientStatus;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────
// Messaging
// ─────────────────────────────────────────────────────────────

export interface MessageThread {
  id: string;
  coach_user_id: string;
  client_user_id: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  coach_unread_count: number;
  client_unread_count: number;
  is_archived_by_coach: boolean;
  is_archived_by_client: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  sender_user_id: string;
  recipient_user_id: string;
  body: string;
  attachment_url: string | null;
  attachment_type: 'image' | 'video' | 'pdf' | 'audio' | null;
  ref_type: MessageRefType | null;
  ref_id: string | null;
  read_at: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface ThreadWithParticipants extends MessageThread {
  coach_display_name: string;
  client_display_name: string;
  coach_avatar_url: string | null;
  client_avatar_url: string | null;
}

// ─────────────────────────────────────────────────────────────
// Check-ins
// ─────────────────────────────────────────────────────────────

export interface CheckInSchedule {
  id: string;
  client_user_id: string;
  coach_user_id: string;
  frequency: CheckInFrequency;
  day_of_week: number; // 1=Mon..7=Sun
  reminder_time: string;
  timezone: string;
  is_active: boolean;
  next_due_at: string | null;
  last_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckIn {
  id: string;
  client_user_id: string;
  coach_user_id: string;
  week_start_date: string;
  status: CheckInStatus;

  weight_kg: number | null;
  body_fat_pct: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;

  energy_level: number | null;
  sleep_quality: number | null;
  stress_level: number | null;
  motivation_level: number | null;
  hunger_level: number | null;
  soreness_level: number | null;

  workouts_completed: number | null;
  workouts_planned: number | null;
  nutrition_adherence_pct: number | null;

  client_notes: string | null;
  client_wins: string | null;
  client_struggles: string | null;
  coach_feedback: string | null;
  coach_action_items: string | null;

  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckInPhoto {
  id: string;
  check_in_id: string;
  storage_path: string;
  pose: 'front' | 'side' | 'back' | 'other';
  display_order: number;
  created_at: string;
}

export interface CheckInWithPhotos extends CheckIn {
  photos: CheckInPhoto[];
}

// ─────────────────────────────────────────────────────────────
// Assigned plans
// ─────────────────────────────────────────────────────────────

export interface AssignedPlan {
  id: string;
  client_user_id: string;
  coach_user_id: string;
  source_program_id: string | null;
  title_fr: string;
  title_en: string;
  title_nl: string;
  description_fr: string | null;
  description_en: string | null;
  description_nl: string | null;
  goal: string;
  duration_weeks: number;
  start_date: string;
  end_date: string;
  status: AssignedPlanStatus;
  weekly_check_in_required: boolean;
  notes_fr: string | null;
  notes_en: string | null;
  notes_nl: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssignedPlanWorkout {
  id: string;
  plan_id: string;
  week_number: number;
  day_of_week: number;
  workout_id: string | null;
  custom_title_fr: string | null;
  custom_title_en: string | null;
  custom_title_nl: string | null;
  custom_notes_fr: string | null;
  custom_notes_en: string | null;
  custom_notes_nl: string | null;
  intensity_modifier: number;
  is_rest_day: boolean;
  is_optional: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssignedPlanMeal {
  id: string;
  plan_id: string;
  target_calories: number | null;
  target_protein_g: number | null;
  target_carbs_g: number | null;
  target_fat_g: number | null;
  target_water_ml: number;
  recipe_ids: string[];
  carb_strategy:
    | 'high_carb_training_day'
    | 'low_carb_rest_day'
    | 'cyclical'
    | 'flat';
  notes_fr: string | null;
  notes_en: string | null;
  notes_nl: string | null;
  created_at: string;
  updated_at: string;
}
