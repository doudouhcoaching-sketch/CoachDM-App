// ============================================================
// Coach DM · Phase 6 · Shared Computations
// Logique métier réutilisable web + mobile
// ============================================================

import type {
  Challenge,
  ChallengeMetric,
  ChallengeParticipant,
  LeaderboardEntry,
  ReactionKind,
} from "./types";

// ============================================================
// CHALLENGES
// ============================================================

/**
 * Calcule le pourcentage de progression d'un participant.
 * Bornée [0, 100].
 */
export function computeChallengeProgress(
  currentValue: number,
  targetValue: number,
): number {
  if (targetValue <= 0) return 0;
  const pct = (currentValue / targetValue) * 100;
  return Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
}

/**
 * Nombre de jours restants jusqu'à fin du challenge.
 * Retourne 0 si terminé.
 */
export function computeChallengeDaysLeft(endsAt: string, now: Date = new Date()): number {
  const end = new Date(endsAt + "T23:59:59");
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Cycle prévu : nb jours total du challenge
 */
export function computeChallengeTotalDays(startsAt: string, endsAt: string): number {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

/**
 * Pace : "le rythme idéal pour finir à temps" (valeur quotidienne moyenne)
 */
export function computeChallengeIdealPace(
  challenge: Pick<Challenge, "target_value" | "starts_at" | "ends_at">,
): number {
  const totalDays = computeChallengeTotalDays(challenge.starts_at, challenge.ends_at);
  return challenge.target_value / totalDays;
}

/**
 * Détecte si un participant est "en retard" sur son challenge
 * (pace réel < 80% de l'idéal)
 */
export function isParticipantBehind(
  participant: Pick<ChallengeParticipant, "current_value" | "joined_at">,
  challenge: Pick<Challenge, "target_value" | "starts_at" | "ends_at">,
  now: Date = new Date(),
): boolean {
  const start = new Date(challenge.starts_at);
  const elapsedDays = Math.max(
    1,
    Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const expected = computeChallengeIdealPace(challenge) * elapsedDays;
  return participant.current_value < expected * 0.8;
}

/**
 * Format d'affichage d'une valeur métrique avec son unité
 */
export function formatChallengeMetric(metric: ChallengeMetric, value: number): string {
  switch (metric) {
    case "workouts_count":
    case "pr_count":
      return `${Math.round(value)}`;
    case "total_volume_kg":
      return value >= 1000
        ? `${(value / 1000).toFixed(1)} t`
        : `${Math.round(value)} kg`;
    case "cardio_distance_km":
      return `${value.toFixed(1)} km`;
    case "cardio_duration_min":
      return value >= 60
        ? `${Math.floor(value / 60)}h${String(Math.round(value % 60)).padStart(2, "0")}`
        : `${Math.round(value)} min`;
    case "sleep_hours_avg":
      return `${value.toFixed(1)} h`;
    case "hydration_days_target":
    case "habit_streak_days":
      return `${Math.round(value)} j`;
    case "custom_metric":
      return value % 1 === 0 ? `${value}` : value.toFixed(1);
    default:
      return `${value}`;
  }
}

// ============================================================
// LEADERBOARDS
// ============================================================

/**
 * Calcule le rang d'un user dans une liste d'entries
 * (méthode "dense ranking" pour éviter les sauts en cas d'égalité)
 */
export function computeLeaderboardRank(
  entries: LeaderboardEntry[],
  userId: string,
): { rank: number; total: number; value: number } | null {
  const sorted = [...entries].sort((a, b) => b.value - a.value);
  const idx = sorted.findIndex((e) => e.user_id === userId);
  if (idx === -1) return null;
  return {
    rank: idx + 1,
    total: sorted.length,
    value: sorted[idx].value,
  };
}

/**
 * Calcule le delta vs la période précédente (en %).
 * Retourne null si pas de comparaison possible.
 */
export function computeLeaderboardDelta(
  currentValue: number,
  previousValue: number | null,
): { absolute: number; pct: number | null } | null {
  if (previousValue === null || previousValue === undefined) {
    return null;
  }
  const absolute = currentValue - previousValue;
  const pct = previousValue === 0 ? null : (absolute / previousValue) * 100;
  return { absolute, pct };
}

/**
 * Récupère le lundi de la semaine courante (ISO week)
 */
export function getCurrentWeekStart(now: Date = new Date()): string {
  const d = new Date(now);
  const day = d.getDay(); // 0 = dimanche
  const diff = (day + 6) % 7; // jours depuis lundi
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

/**
 * 1er du mois courant
 */
export function getCurrentMonthStart(now: Date = new Date()): string {
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

// ============================================================
// REACTIONS
// ============================================================

export const REACTION_EMOJIS: Record<ReactionKind, string> = {
  fire: "🔥",
  muscle: "💪",
  clap: "👏",
  gold: "🥇",
  brain: "🧠",
  heart: "❤️",
};

export const REACTION_ORDER: ReactionKind[] = [
  "fire",
  "muscle",
  "clap",
  "gold",
  "brain",
  "heart",
];

/**
 * Aggrège un tableau de réactions en compteurs par type
 */
export function aggregateReactions(
  reactions: { kind: ReactionKind }[],
): Record<ReactionKind, number> {
  const counts: Record<ReactionKind, number> = {
    fire: 0,
    muscle: 0,
    clap: 0,
    gold: 0,
    brain: 0,
    heart: 0,
  };
  for (const r of reactions) {
    counts[r.kind] = (counts[r.kind] ?? 0) + 1;
  }
  return counts;
}

// ============================================================
// STORIES
// ============================================================

/**
 * Une story est-elle visible maintenant ?
 * (visible AND (featured OR pas expirée))
 */
export function isStoryActive(
  story: { status: string; featured: boolean; expires_at: string },
  now: Date = new Date(),
): boolean {
  if (story.status !== "visible") return false;
  if (story.featured) return true;
  return new Date(story.expires_at).getTime() > now.getTime();
}

/**
 * Temps restant avant expiration ("expire dans 4h32")
 */
export function computeStoryTimeLeft(
  expiresAt: string,
  now: Date = new Date(),
): { hours: number; minutes: number; total_minutes: number } {
  const diffMs = new Date(expiresAt).getTime() - now.getTime();
  if (diffMs <= 0) return { hours: 0, minutes: 0, total_minutes: 0 };
  const total_minutes = Math.floor(diffMs / 60000);
  return {
    hours: Math.floor(total_minutes / 60),
    minutes: total_minutes % 60,
    total_minutes,
  };
}

// ============================================================
// FEED INSIGHTS (code couleur Coach DM)
// ============================================================

export type CommunityInsightTone = "insight" | "warning" | "info" | "tactic";

export interface CommunityInsight {
  tone: CommunityInsightTone;
  text_fr: string;
  text_en: string;
  text_nl: string;
}

/**
 * Génère des insights contextuels pour un dashboard community.
 * Suit la philosophie Phase 4/5 : référence + référence scientifique optionnelle.
 */
export function computeCommunityInsights(input: {
  postsThisWeek: number;
  reactionsReceived: number;
  activeChallenges: number;
  leaderboardRank: number | null;
  totalCommunityMembers: number;
}): CommunityInsight[] {
  const insights: CommunityInsight[] = [];

  // Engagement faible
  if (input.postsThisWeek === 0) {
    insights.push({
      tone: "info",
      text_fr: "Aucun partage cette semaine. La communauté est un levier d'adhérence (Bandura 2001).",
      text_en: "No share this week. Community is a key adherence driver (Bandura 2001).",
      text_nl: "Geen deelname deze week. Gemeenschap is een sleutelfactor voor volharding (Bandura 2001).",
    });
  }

  // Top 3 leaderboard
  if (input.leaderboardRank !== null && input.leaderboardRank <= 3) {
    insights.push({
      tone: "insight",
      text_fr: `Top ${input.leaderboardRank} de ta communauté cette semaine. Garde le rythme.`,
      text_en: `Top ${input.leaderboardRank} in your community this week. Keep the pace.`,
      text_nl: `Top ${input.leaderboardRank} in je gemeenschap deze week. Hou het tempo vast.`,
    });
  }

  // Beaucoup de réactions reçues
  if (input.reactionsReceived >= 10) {
    insights.push({
      tone: "tactic",
      text_fr: `${input.reactionsReceived} réactions reçues — le feedback social renforce la motivation (Deci & Ryan 2000).`,
      text_en: `${input.reactionsReceived} reactions received — social feedback boosts motivation (Deci & Ryan 2000).`,
      text_nl: `${input.reactionsReceived} reacties ontvangen — sociale feedback versterkt motivatie (Deci & Ryan 2000).`,
    });
  }

  // Aucun challenge actif
  if (input.activeChallenges === 0) {
    insights.push({
      tone: "warning",
      text_fr: "Aucun challenge actif. Les objectifs limités dans le temps augmentent l'adhérence de 30% (Locke 2002).",
      text_en: "No active challenge. Time-bound goals increase adherence by 30% (Locke 2002).",
      text_nl: "Geen actieve uitdaging. Tijdgebonden doelen verhogen volharding met 30% (Locke 2002).",
    });
  }

  return insights;
}

// ============================================================
// CONSTANTS
// ============================================================

export const COACH_DM_COLORS = {
  bg: "#0A0A0A",
  gold: "#D4AF37",
  green: "#10B981",
  red: "#EF4444",
  blue: "#38BDF8",
  violet: "#A78BFA",
  text: "#FFFFFF",
  textMuted: "#A1A1AA",
  border: "#27272A",
} as const;

export const COMMUNITY_TONE_COLORS: Record<CommunityInsightTone, string> = {
  insight: COACH_DM_COLORS.green,
  warning: COACH_DM_COLORS.red,
  info: COACH_DM_COLORS.blue,
  tactic: COACH_DM_COLORS.violet,
};

export const COMMUNITY_TONE_ICONS: Record<CommunityInsightTone, string> = {
  insight: "✓",
  warning: "✗",
  info: "ⓘ",
  tactic: "⚑",
};
