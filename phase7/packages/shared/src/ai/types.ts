// =====================================================================
// COACH DM · APP · PHASE 7 — IA COACH ASSISTANT
// packages/shared/src/ai/types.ts
// Types TypeScript complets, partagés web + mobile.
// =====================================================================

export type Lang = 'fr' | 'en' | 'nl';

export type AIRole = 'system' | 'user' | 'assistant' | 'tool';

export type AIIntent =
  | 'general'
  | 'program_adjust'
  | 'plateau_check'
  | 'recovery_reco'
  | 'session_suggest'
  | 'nutrition_query'
  | 'community_summary';

export type AIAdjustmentKind =
  | 'deload'
  | 'intensify'
  | 'swap_exercise'
  | 'add_volume'
  | 'reduce_volume'
  | 'change_split'
  | 'add_recovery';

export type AIAdjustmentStatus =
  | 'proposed'
  | 'accepted'
  | 'rejected'
  | 'applied'
  | 'expired';

export type AIPlateauMetric =
  | 'strength'
  | 'volume'
  | 'bodyweight'
  | 'pr_count'
  | 'rpe_drift';

export type ReadinessZone = 'green' | 'amber' | 'red';

// ---------------------------------------------------------------------
// Conversation + Messages
// ---------------------------------------------------------------------
export interface AIConversation {
  id: string;
  coach_id: string;
  client_id: string;
  title_fr: string;
  title_en: string;
  title_nl: string;
  intent: AIIntent;
  is_archived: boolean;
  last_msg_at: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: AIRole;
  content: string;
  lang: Lang;
  tool_name?: string | null;
  tool_args?: Record<string, unknown> | null;
  tool_result?: Record<string, unknown> | null;
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  model: string;
  created_at: string;
}

// ---------------------------------------------------------------------
// Contexte client
// ---------------------------------------------------------------------
export interface AIClientContext {
  client_id: string;
  coach_id: string;
  age?: number | null;
  sex?: 'm' | 'f' | 'x' | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  bodyfat_pct?: number | null;
  goal?: string | null;
  experience_level?: 'beginner' | 'intermediate' | 'advanced' | 'elite' | null;
  bmr_kcal?: number | null;
  tdee_kcal?: number | null;
  proteins_g?: number | null;
  carbs_g?: number | null;
  fats_g?: number | null;
  acwr_7_28?: number | null;
  weekly_volume_kg?: number | null;
  weekly_sessions?: number | null;
  recovery_score?: number | null;
  sleep_avg_h?: number | null;
  hrv_avg?: number | null;
  rpe_avg_7d?: number | null;
  pr_count_30d: number;
  top_pr_summary?: string | null;
  challenge_active: boolean;
  leaderboard_rank?: number | null;
  refreshed_at: string;
  raw_snapshot?: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------
// Plan adjustments
// ---------------------------------------------------------------------
export interface AIProposedChange {
  exercise_id?: string;
  exercise_name?: string;
  sets_delta?: number;
  reps_delta?: number;
  intensity_pct?: number;
  rest_s_delta?: number;
  replace_with_exercise_id?: string;
  notes_fr?: string;
  notes_en?: string;
  notes_nl?: string;
}

export interface AIEvidence {
  acwr?: number;
  rpe_drift?: number;
  pr_stagnation_weeks?: number;
  sleep_avg_h?: number;
  hrv_avg?: number;
  volume_delta_pct?: number;
  [k: string]: unknown;
}

export interface AIPlanAdjustment {
  id: string;
  coach_id: string;
  client_id: string;
  conversation_id?: string | null;
  program_id?: string | null;
  kind: AIAdjustmentKind;
  reason_fr: string;
  reason_en: string;
  reason_nl: string;
  evidence: AIEvidence;
  proposed_changes: { changes: AIProposedChange[]; rationale: string };
  scientific_refs: string[];
  status: AIAdjustmentStatus;
  applied_by?: string | null;
  applied_at?: string | null;
  expires_at: string;
  created_at: string;
}

// ---------------------------------------------------------------------
// Plateau detection
// ---------------------------------------------------------------------
export interface AIPlateauDetection {
  id: string;
  coach_id: string;
  client_id: string;
  metric: AIPlateauMetric;
  exercise_id?: string | null;
  window_days: number;
  baseline: number;
  current_value: number;
  delta_pct: number;
  confidence: number;
  insight_fr: string;
  insight_en: string;
  insight_nl: string;
  recommended_action?: AIAdjustmentKind | null;
  detected_at: string;
  resolved_at?: string | null;
  resolved_by_adjustment_id?: string | null;
}

// ---------------------------------------------------------------------
// Recovery reco
// ---------------------------------------------------------------------
export interface AIRecoveryProtocol {
  sleep_target_h: number;
  mobility_min: number;
  cardio_min?: number;
  cardio_zone?: 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5';
  ice_bath?: boolean;
  ice_bath_temp_c?: number;
  ice_bath_duration_min?: number;
  contrast_shower?: boolean;
  rest_day?: boolean;
  carbs_g_extra?: number;
}

export interface AIRecoveryReco {
  id: string;
  coach_id: string;
  client_id: string;
  date: string;
  acwr?: number | null;
  sleep_h?: number | null;
  hrv?: number | null;
  rpe_yesterday?: number | null;
  readiness: number;
  zone: ReadinessZone;
  recommendation_fr: string;
  recommendation_en: string;
  recommendation_nl: string;
  protocol: AIRecoveryProtocol;
  scientific_refs: string[];
  created_at: string;
}

// ---------------------------------------------------------------------
// Session suggestion
// ---------------------------------------------------------------------
export interface AISessionExercise {
  exercise_id?: string;
  name_fr: string;
  name_en: string;
  name_nl: string;
  sets: number;
  reps?: number;
  duration_s?: number;
  rest_s: number;
  intensity_pct?: number;
  rpe_target?: number;
  notes_fr?: string;
  notes_en?: string;
  notes_nl?: string;
  tip_kind?: 'insight' | 'warning' | 'info' | 'tactic';
  tip_fr?: string;
  tip_en?: string;
  tip_nl?: string;
}

export interface AISessionSuggestion {
  id: string;
  coach_id: string;
  client_id: string;
  date: string;
  readiness: number;
  zone: ReadinessZone;
  suggested_kind: 'strength' | 'conditioning' | 'mobility' | 'rest' | 'tactical';
  title_fr: string;
  title_en: string;
  title_nl: string;
  duration_min: number;
  rpe_target?: number | null;
  exercises: AISessionExercise[];
  rationale_fr: string;
  rationale_en: string;
  rationale_nl: string;
  scientific_refs: string[];
  accepted?: boolean | null;
  accepted_at?: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------
// Chat request/response
// ---------------------------------------------------------------------
export interface AIChatRequest {
  conversation_id?: string;
  client_id: string;
  user_message: string;
  lang: Lang;
  intent?: AIIntent;
  attach_context?: boolean;
}

export interface AIChatToolCall {
  name: string;
  args: Record<string, unknown>;
  result?: Record<string, unknown>;
}

export interface AIChatResponse {
  conversation_id: string;
  assistant_message: string;
  lang: Lang;
  tools_used: AIChatToolCall[];
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  produced?: {
    plan_adjustment_id?: string;
    plateau_detection_id?: string;
    recovery_reco_id?: string;
    session_suggestion_id?: string;
  };
}

// ---------------------------------------------------------------------
// Usage / cost
// ---------------------------------------------------------------------
export interface AIUsageDaily {
  coach_id: string;
  date: string;
  tokens_in: number;
  tokens_out: number;
  requests: number;
  cost_eur: number;
}
