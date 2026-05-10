// ═══════════════════════════════════════════════════════════════════════════
// COACH DM · Phase 4 · Shared logic — Recovery
// ═══════════════════════════════════════════════════════════════════════════
// Calculs purs réutilisés côté web et mobile
// ═══════════════════════════════════════════════════════════════════════════

import type {
  HydrationDaily,
  HydrationTarget,
  Habit,
  HabitLog,
  RecoveryInsight,
  SleepSession,
} from './types';

// ─── Sommeil ─────────────────────────────────────────────────────────────────

/** Durée moyenne de sommeil sur les N dernières nuits (en minutes) */
export function avgSleepMinutes(sessions: SleepSession[], days = 7): number {
  if (sessions.length === 0) return 0;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const recent = sessions.filter((s) => s.sleep_date >= cutoffStr);
  if (recent.length === 0) return 0;
  return recent.reduce((sum, s) => sum + s.duration_min, 0) / recent.length;
}

/** Format minutes → "7h32" */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
}

/**
 * Insights sommeil — code couleur Coach DM
 * - vert (insight) : référence scientifique clé
 * - rouge (warning) : seuil critique / risque
 * - bleu (info) : norme chiffrée
 * - violet (tactic) : application concrète
 */
export function sleepInsights(session: SleepSession, recent: SleepSession[]): RecoveryInsight[] {
  const out: RecoveryInsight[] = [];
  const dur = session.duration_min;

  // Warning : nuit courte
  if (dur < 360) {
    out.push({
      level: 'warning',
      title: 'Sommeil insuffisant',
      message:
        '< 6h augmente le risque de blessure de 1.7x chez l\'athlète et réduit la performance cognitive.',
      source: 'Milewski 2014, Mah 2011',
    });
  } else if (dur < 420) {
    out.push({
      level: 'info',
      title: 'Sous l\'optimal',
      message: 'Vise 7-9h pour la récupération musculaire et la consolidation motrice.',
      source: 'Hirshkowitz 2015 (NSF)',
    });
  }

  // Insight : nuit complète
  if (dur >= 480 && dur <= 540) {
    out.push({
      level: 'insight',
      title: 'Fenêtre optimale',
      message: '8-9h favorisent la sécrétion de GH nocturne et la consolidation musculaire.',
      source: 'Van Cauter 2008',
    });
  }

  // Tactic : régularité
  const avgRecent = avgSleepMinutes(recent, 7);
  if (avgRecent >= 420) {
    out.push({
      level: 'tactic',
      title: 'Régularité solide',
      message: 'Maintenir un horaire de coucher constant améliore la qualité de récup de 17%.',
      source: 'Phillips 2017',
    });
  }

  // HRV
  if (session.hrv_rmssd_ms !== null && session.hrv_rmssd_ms !== undefined) {
    if (session.hrv_rmssd_ms < 30) {
      out.push({
        level: 'warning',
        title: 'HRV basse',
        message: 'RMSSD < 30 ms suggère un état de fatigue. Réduire l\'intensité aujourd\'hui.',
        source: 'Plews 2013',
      });
    } else if (session.hrv_rmssd_ms >= 60) {
      out.push({
        level: 'insight',
        title: 'HRV élevée',
        message: 'RMSSD ≥ 60 ms : système nerveux récupéré. Bonne fenêtre pour l\'intensité.',
        source: 'Plews 2013',
      });
    }
  }

  // Qualité subjective
  if (session.quality !== null) {
    if (session.quality <= 2) {
      out.push({
        level: 'warning',
        title: 'Qualité dégradée',
        message: 'Évite caféine après 14h, écrans 30 min avant coucher, chambre < 19°C.',
        source: 'Drake 2013, Chang 2015',
      });
    } else if (session.quality >= 4 && dur >= 420) {
      out.push({
        level: 'tactic',
        title: 'Combo gagnant',
        message: 'Durée + qualité optimales. Profite-en pour pousser l\'entraînement aujourd\'hui.',
      });
    }
  }

  return out;
}

// ─── Hydratation ────────────────────────────────────────────────────────────

export interface HydrationStatus {
  total_ml: number;
  target_ml: number;
  remaining_ml: number;
  percent: number;            // 0..150 (peut dépasser 100)
  status: 'low' | 'on_track' | 'reached' | 'over';
}

export function hydrationStatus(total: number, target: number): HydrationStatus {
  const percent = target > 0 ? (total / target) * 100 : 0;
  let status: HydrationStatus['status'];
  if (percent < 40) status = 'low';
  else if (percent < 100) status = 'on_track';
  else if (percent < 150) status = 'reached';
  else status = 'over';

  return {
    total_ml: total,
    target_ml: target,
    remaining_ml: Math.max(0, target - total),
    percent: Math.round(percent),
    status,
  };
}

/** Objectif personnalisé recommandé (EFSA 2010 + ajustement activité) */
export function recommendedHydration(params: {
  weightKg: number;
  sex: 'M' | 'F';
  trainingMinutes?: number;   // minutes d'entraînement aujourd'hui
}): number {
  // Base : 35 ml/kg (homme) ou 31 ml/kg (femme)
  const base = params.sex === 'M' ? params.weightKg * 35 : params.weightKg * 31;
  // +500 ml par heure d'entraînement
  const training = (params.trainingMinutes ?? 0) / 60 * 500;
  const total = base + training;
  // Arrondi au 100ml près, plafonné à 6L
  return Math.min(6000, Math.round(total / 100) * 100);
}

export function hydrationInsights(status: HydrationStatus, hourLocal: number): RecoveryInsight[] {
  const out: RecoveryInsight[] = [];

  if (hourLocal >= 11 && status.percent < 25) {
    out.push({
      level: 'warning',
      title: 'Retard hydratation',
      message: '< 25% de l\'objectif à 11h : déshydratation à -2% du poids = -10% performance.',
      source: 'Casa 2000 (NATA)',
    });
  }

  if (status.status === 'reached') {
    out.push({
      level: 'insight',
      title: 'Objectif atteint',
      message: 'Maintien d\'un volume plasmatique optimal : meilleure thermorégulation et lucidité.',
      source: 'EFSA 2010',
    });
  }

  if (status.status === 'over' && status.percent > 200) {
    out.push({
      level: 'warning',
      title: 'Surhydratation',
      message: 'Au-delà de 2x l\'objectif sans activité intense : risque de dilution sodique.',
      source: 'Hew-Butler 2015',
    });
  }

  if (hourLocal >= 6 && hourLocal <= 9 && status.total_ml === 0) {
    out.push({
      level: 'tactic',
      title: 'Première gorgée',
      message: '500 ml au réveil compensent la déshydratation nocturne (perte 300-700 ml).',
      source: 'Sawka 2007',
    });
  }

  return out;
}

// ─── Habits ─────────────────────────────────────────────────────────────────

/** Habits actives aujourd'hui (selon active_days) */
export function habitsForToday(habits: Habit[], date: Date = new Date()): Habit[] {
  // Date.getDay() : 0=Dim..6=Sam → on convertit en 1=Lun..7=Dim
  const jsDay = date.getDay();
  const isoDay = jsDay === 0 ? 7 : jsDay;
  return habits.filter(
    (h) => !h.archived && h.active_days?.includes(isoDay)
  );
}

/** Taux de complétion sur N jours (0..1) */
export function habitCompletionRate(
  habit: Habit,
  logs: HabitLog[],
  days = 7
): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const habitLogs = logs.filter(
    (l) => l.habit_id === habit.id && l.log_date >= cutoffStr
  );

  // Nombre de jours actifs dans la fenêtre
  let activeDays = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const jsDay = d.getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    if (habit.active_days?.includes(isoDay)) activeDays++;
  }

  if (activeDays === 0) return 0;
  return Math.min(1, habitLogs.length / activeDays);
}

// ─── Recovery Score ─────────────────────────────────────────────────────────

export interface RecoveryScoreBreakdown {
  total: number;
  sleep: number;        // /40
  hydration: number;    // /30
  habits: number;       // /30
}

/**
 * Calcul côté client (utile pour affichage temps réel sans aller-retour DB)
 * Doit donner le même résultat que fn_compute_recovery_score côté SQL
 */
export function computeRecoveryScore(params: {
  avgSleepMin: number;
  daysHydrationTargetMet: number;     // sur 7
  habitsActiveCount: number;
  habitLogsLast7d: number;
}): RecoveryScoreBreakdown {
  const sleep = Math.max(0, Math.min(40, (params.avgSleepMin - 240) / 6));
  const hydration = (params.daysHydrationTargetMet / 7) * 30;
  const habits =
    params.habitsActiveCount === 0
      ? 0
      : Math.min(
          30,
          (params.habitLogsLast7d / 7 / params.habitsActiveCount) * 30
        );

  return {
    total: Math.round(sleep + hydration + habits),
    sleep: Math.round(sleep),
    hydration: Math.round(hydration),
    habits: Math.round(habits),
  };
}

// ─── Streaks (calcul côté client en cas de besoin) ──────────────────────────

/** Compte de jours consécutifs (les plus récents) où une condition est remplie */
export function computeStreak(
  daysWithSuccess: string[],     // YYYY-MM-DD triés DESC
  today: string = new Date().toISOString().slice(0, 10)
): number {
  if (daysWithSuccess.length === 0) return 0;

  const set = new Set(daysWithSuccess);
  let count = 0;
  const cursor = new Date(today);

  // Aujourd'hui ou hier comme point de départ
  if (!set.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(cursor.toISOString().slice(0, 10))) return 0;
  }

  while (set.has(cursor.toISOString().slice(0, 10))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return count;
}
