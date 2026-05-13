// =====================================================================
// COACH DM · APP · PHASE 7 — IA COACH ASSISTANT
// packages/shared/src/ai/computations.ts
// Logique métier pure : readiness, plateau, ajustement, ranking.
// Aucune dépendance externe. Testable unitairement.
// =====================================================================

import type {
  AIClientContext,
  AIRecoveryProtocol,
  ReadinessZone,
  AIPlateauMetric,
  AIAdjustmentKind,
} from './types';

// ---------------------------------------------------------------------
// 1. Readiness — Score 0-100 + zone
// ---------------------------------------------------------------------
export interface ReadinessInput {
  acwr?: number | null;             // 0.8-1.3 idéal (Gabbett 2016)
  sleep_h?: number | null;          // 7-9h idéal (Mah 2011)
  hrv?: number | null;              // relatif baseline
  hrv_baseline?: number | null;
  rpe_yesterday?: number | null;    // RPE séance de la veille
}

export interface ReadinessResult {
  score: number;
  zone: ReadinessZone;
  contributors: {
    acwr_pts: number;
    sleep_pts: number;
    hrv_pts: number;
    rpe_pts: number;
  };
  flags: string[];
}

export function computeReadiness(input: ReadinessInput): ReadinessResult {
  const flags: string[] = [];
  let acwr_pts = 25;
  let sleep_pts = 25;
  let hrv_pts = 25;
  let rpe_pts = 25;

  // ACWR (Gabbett 2016) — sweet spot 0.8-1.3
  if (input.acwr != null) {
    const a = input.acwr;
    if (a >= 0.8 && a <= 1.3) acwr_pts = 25;
    else if (a > 1.3 && a <= 1.5) { acwr_pts = 15; flags.push('acwr_high'); }
    else if (a > 1.5) { acwr_pts = 5; flags.push('acwr_danger'); }
    else if (a >= 0.5 && a < 0.8) { acwr_pts = 18; flags.push('acwr_low'); }
    else { acwr_pts = 10; flags.push('acwr_understim'); }
  }

  // Sommeil (Mah 2011)
  if (input.sleep_h != null) {
    const s = input.sleep_h;
    if (s >= 7.5) sleep_pts = 25;
    else if (s >= 7) sleep_pts = 22;
    else if (s >= 6.5) { sleep_pts = 17; flags.push('sleep_low'); }
    else if (s >= 6) { sleep_pts = 12; flags.push('sleep_deficit'); }
    else { sleep_pts = 5; flags.push('sleep_critical'); }
  }

  // HRV relatif (si baseline fourni)
  if (input.hrv != null && input.hrv_baseline != null && input.hrv_baseline > 0) {
    const ratio = input.hrv / input.hrv_baseline;
    if (ratio >= 0.95) hrv_pts = 25;
    else if (ratio >= 0.85) { hrv_pts = 18; flags.push('hrv_dip'); }
    else if (ratio >= 0.75) { hrv_pts = 10; flags.push('hrv_low'); }
    else { hrv_pts = 3; flags.push('hrv_crash'); }
  } else if (input.hrv != null) {
    hrv_pts = 20;
  }

  // RPE veille
  if (input.rpe_yesterday != null) {
    const r = input.rpe_yesterday;
    if (r <= 6) rpe_pts = 25;
    else if (r <= 7.5) rpe_pts = 22;
    else if (r <= 8.5) { rpe_pts = 17; flags.push('high_rpe_yesterday'); }
    else { rpe_pts = 8; flags.push('rpe_maxed'); }
  }

  const score = Math.round(acwr_pts + sleep_pts + hrv_pts + rpe_pts);
  const zone: ReadinessZone =
    score >= 75 ? 'green' :
    score >= 50 ? 'amber' :
    'red';

  return {
    score,
    zone,
    contributors: { acwr_pts, sleep_pts, hrv_pts, rpe_pts },
    flags,
  };
}

// ---------------------------------------------------------------------
// 2. Recovery protocol from readiness
// ---------------------------------------------------------------------
export function buildRecoveryProtocol(r: ReadinessResult, input: ReadinessInput): AIRecoveryProtocol {
  const sleep_target = r.zone === 'red' ? 9 : r.zone === 'amber' ? 8.5 : 8;

  if (r.zone === 'red') {
    return {
      sleep_target_h: sleep_target,
      mobility_min: 20,
      cardio_min: 0,
      rest_day: true,
      contrast_shower: true,
      carbs_g_extra: 50,
    };
  }
  if (r.zone === 'amber') {
    return {
      sleep_target_h: sleep_target,
      mobility_min: 15,
      cardio_min: 25,
      cardio_zone: 'Z2',
      rest_day: false,
      contrast_shower: true,
      ice_bath: input.rpe_yesterday != null && input.rpe_yesterday >= 8,
      ice_bath_temp_c: 11,
      ice_bath_duration_min: 10,
      carbs_g_extra: 30,
    };
  }
  return {
    sleep_target_h: sleep_target,
    mobility_min: 10,
    cardio_min: 0,
    rest_day: false,
    contrast_shower: false,
  };
}

// ---------------------------------------------------------------------
// 3. Plateau detection — version pure (signal d'entrée déjà agrégé)
// Compatible avec Phase 5 computePlateauDetection.
// ---------------------------------------------------------------------
export interface PlateauInput {
  metric: AIPlateauMetric;
  series: { t: number; v: number }[]; // série triée par temps
  window_days?: number;
  exercise_id?: string;
}

export interface PlateauResult {
  isPlateau: boolean;
  metric: AIPlateauMetric;
  baseline: number;
  current: number;
  delta_pct: number;
  confidence: number;
  recommended_action?: AIAdjustmentKind;
  insight_key: string;
}

export function detectPlateau(input: PlateauInput): PlateauResult {
  const win = input.window_days ?? 28;
  const series = input.series;
  if (series.length < 4) {
    return { isPlateau: false, metric: input.metric, baseline: 0, current: 0, delta_pct: 0, confidence: 0, insight_key: 'not_enough_data' };
  }

  const now = series[series.length - 1].t;
  const cutoff = now - win * 86400000;
  const recent = series.filter(p => p.t >= cutoff);
  const older = series.filter(p => p.t < cutoff);

  if (recent.length < 3 || older.length < 3) {
    return { isPlateau: false, metric: input.metric, baseline: 0, current: 0, delta_pct: 0, confidence: 0, insight_key: 'not_enough_data' };
  }

  const baseline = mean(older.slice(-Math.min(older.length, 8)).map(p => p.v));
  const current = mean(recent.map(p => p.v));
  const delta_pct = baseline === 0 ? 0 : ((current - baseline) / baseline) * 100;

  // Seuils par métrique
  const thresholds: Record<AIPlateauMetric, number> = {
    strength: 1.5,
    volume: 3,
    bodyweight: 0.5,
    pr_count: 0.1,
    rpe_drift: -5,
  };
  const threshold = thresholds[input.metric];

  // Pour rpe_drift, plateau = RPE qui monte (delta positif) sur même charge
  // Pour les autres, plateau = pas de progression (|delta| < threshold)
  let isPlateau = false;
  if (input.metric === 'rpe_drift') {
    isPlateau = delta_pct > Math.abs(threshold);
  } else {
    isPlateau = Math.abs(delta_pct) < threshold;
  }

  // Confiance basée sur stabilité (faible variance = plus confiant)
  const stddev = std(recent.map(p => p.v));
  const cv = current === 0 ? 1 : stddev / Math.abs(current);
  const confidence = Math.max(0, Math.min(1, 1 - cv * 2));

  let recommended_action: AIAdjustmentKind | undefined;
  if (isPlateau) {
    switch (input.metric) {
      case 'strength':   recommended_action = 'intensify'; break;
      case 'volume':     recommended_action = 'add_volume'; break;
      case 'bodyweight': recommended_action = 'change_split'; break;
      case 'pr_count':   recommended_action = 'swap_exercise'; break;
      case 'rpe_drift':  recommended_action = 'deload'; break;
    }
  }

  return {
    isPlateau,
    metric: input.metric,
    baseline,
    current,
    delta_pct: Math.round(delta_pct * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    recommended_action,
    insight_key: isPlateau ? `plateau_${input.metric}` : `progressing_${input.metric}`,
  };
}

// ---------------------------------------------------------------------
// 4. Adjustment validation — sanity check avant insertion DB
// ---------------------------------------------------------------------
export interface AdjustmentValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateAdjustment(args: {
  kind: AIAdjustmentKind;
  ctx: AIClientContext;
  evidence: Record<string, unknown>;
  changes: { sets_delta?: number; intensity_pct?: number; reps_delta?: number }[];
}): AdjustmentValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Safety net : pas d'intensification si recovery basse
  if (args.kind === 'intensify' || args.kind === 'add_volume') {
    if (args.ctx.recovery_score != null && args.ctx.recovery_score < 50) {
      errors.push('recovery_too_low_for_intensify');
    }
    if (args.ctx.acwr_7_28 != null && args.ctx.acwr_7_28 > 1.3) {
      errors.push('acwr_already_high');
    }
  }

  // Pas de deload si tout va bien
  if (args.kind === 'deload') {
    if (args.ctx.recovery_score != null && args.ctx.recovery_score > 80 &&
        args.ctx.acwr_7_28 != null && args.ctx.acwr_7_28 < 1.1) {
      warnings.push('deload_maybe_unnecessary');
    }
  }

  // Cohérence des changes
  for (const ch of args.changes) {
    if (ch.intensity_pct != null && (ch.intensity_pct < 0.4 || ch.intensity_pct > 1.05)) {
      errors.push(`intensity_out_of_range:${ch.intensity_pct}`);
    }
    if (ch.sets_delta != null && Math.abs(ch.sets_delta) > 5) {
      warnings.push(`sets_delta_large:${ch.sets_delta}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ---------------------------------------------------------------------
// 5. Cost estimation tokens → EUR
// ---------------------------------------------------------------------
// Pricing approximatif Claude Sonnet 4 (à actualiser si besoin)
const PRICE_IN_PER_MTOK = 3.0;   // USD / million tokens input
const PRICE_OUT_PER_MTOK = 15.0; // USD / million tokens output
const USD_EUR = 0.92;            // taux moyen

export function estimateCostEur(tokens_in: number, tokens_out: number): number {
  const usd = (tokens_in / 1_000_000) * PRICE_IN_PER_MTOK + (tokens_out / 1_000_000) * PRICE_OUT_PER_MTOK;
  return Math.round(usd * USD_EUR * 10000) / 10000;
}

// ---------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const v = arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(v);
}
