// ============================================================
// Coach DM · Phase 6 · Shared Types
// Types TypeScript pour la communauté (web + mobile)
// ============================================================

export type PostKind =
  | "text"
  | "image"
  | "workout_share"
  | "pr_celebration"
  | "transformation"
  | "recovery_milestone"
  | "challenge_progress";

export type PostStatus = "visible" | "hidden" | "flagged" | "removed";

export type ReactionKind = "fire" | "muscle" | "clap" | "gold" | "brain" | "heart";

export type ReportReason = "spam" | "inappropriate" | "harassment" | "misinformation" | "other";

export interface CommunityPost {
  id: string;
  coach_id: string;
  author_id: string;
  kind: PostKind;
  content: string | null;
  image_url: string | null;
  ref_table: string | null;
  ref_id: string | null;
  status: PostStatus;
  hidden_reason: string | null;
  hidden_by: string | null;
  hidden_at: string | null;
  reactions_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommunityPostWithAuthor extends CommunityPost {
  author: {
    id: string;
    full_name: string | null;
    display_name?: string | null;
    avatar_url: string | null;
  };
  my_reactions?: ReactionKind[];
}

export interface CommunityComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  status: "visible" | "hidden" | "removed";
  hidden_by: string | null;
  hidden_at: string | null;
  created_at: string;
}

export interface CommunityReaction {
  id: string;
  post_id: string;
  user_id: string;
  kind: ReactionKind;
  created_at: string;
}

export interface CommunityReport {
  id: string;
  post_id: string | null;
  comment_id: string | null;
  reporter_id: string;
  reason: ReportReason;
  details: string | null;
  status: "pending" | "reviewed" | "dismissed";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// ---------- CHALLENGES ----------
export type ChallengeMetric =
  | "workouts_count"
  | "total_volume_kg"
  | "cardio_distance_km"
  | "cardio_duration_min"
  | "sleep_hours_avg"
  | "hydration_days_target"
  | "habit_streak_days"
  | "pr_count"
  | "custom_metric";

export type ChallengeStatus = "draft" | "active" | "completed" | "cancelled";
export type ChallengeVisibility = "coach" | "private";

export interface Challenge {
  id: string;
  coach_id: string;
  created_by: string;
  title_fr: string;
  title_en: string;
  title_nl: string;
  description_fr: string | null;
  description_en: string | null;
  description_nl: string | null;
  metric: ChallengeMetric;
  target_value: number;
  unit: string | null;
  starts_at: string;
  ends_at: string;
  visibility: ChallengeVisibility;
  status: ChallengeStatus;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  joined_at: string;
  current_value: number;
  progress_pct: number;
  completed_at: string | null;
  rank: number | null;
  last_recomputed_at: string;
}

export interface ChallengeParticipantWithProfile extends ChallengeParticipant {
  profile: {
    id: string;
    full_name: string | null;
    display_name?: string | null;
    avatar_url: string | null;
  };
}

export interface ChallengeEntry {
  id: string;
  challenge_id: string;
  user_id: string;
  entry_date: string;
  value: number;
  note: string | null;
  proof_image_url: string | null;
  created_at: string;
}

// ---------- LEADERBOARDS ----------
export type LeaderboardPeriod = "week" | "month";
export type LeaderboardMetric =
  | "workouts_count"
  | "total_volume_kg"
  | "cardio_distance_km"
  | "cardio_duration_min"
  | "sleep_hours_avg"
  | "recovery_score_avg";

export interface LeaderboardPreference {
  user_id: string;
  coach_id: string | null;
  participates: boolean;
  display_name: string | null;
  show_avatar: boolean;
  updated_at: string;
}

export interface LeaderboardEntry {
  id: string;
  coach_id: string;
  user_id: string;
  period: LeaderboardPeriod;
  period_start: string;
  period_end: string;
  metric: LeaderboardMetric;
  value: number;
  rank: number | null;
  computed_at: string;
}

export interface LeaderboardEntryWithProfile extends LeaderboardEntry {
  profile: {
    id: string;
    full_name: string | null;
    display_name?: string | null;
    avatar_url: string | null;
  };
}

// ---------- STORIES ----------
export type StoryKind = "photo" | "before_after" | "milestone";
export type StoryStatus = "visible" | "hidden" | "expired" | "removed";

export interface CommunityStory {
  id: string;
  coach_id: string;
  author_id: string;
  kind: StoryKind;
  caption_fr: string | null;
  caption_en: string | null;
  caption_nl: string | null;
  image_url: string;
  image_before_url: string | null;
  stat_label: string | null;
  stat_value: string | null;
  expires_at: string;
  featured: boolean;
  featured_by: string | null;
  featured_at: string | null;
  status: StoryStatus;
  views_count: number;
  reactions_count: number;
  created_at: string;
}

// ---------- NOTIFICATIONS ----------
export type CommunityNotifKind =
  | "new_comment"
  | "new_reaction"
  | "story_featured"
  | "new_challenge"
  | "challenge_completed"
  | "challenge_invited"
  | "leaderboard_top3"
  | "post_flagged";

export interface CommunityNotification {
  id: string;
  user_id: string;
  kind: CommunityNotifKind;
  title_fr: string;
  title_en: string;
  title_nl: string;
  body_fr: string | null;
  body_en: string | null;
  body_nl: string | null;
  ref_table: string | null;
  ref_id: string | null;
  read_at: string | null;
  pushed_at: string | null;
  created_at: string;
}
