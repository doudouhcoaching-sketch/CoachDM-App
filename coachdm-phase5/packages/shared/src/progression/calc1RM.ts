// =====================================================================
// Coach DM · Phase 5 · 1RM estimation
// Sources : Epley 1985, Brzycki 1993
// =====================================================================

/**
 * Epley formula : 1RM = w × (1 + reps/30)
 * Plus généreuse, fiable pour reps ≥ 10
 */
export function estimate1RMEpley(loadKg: number, reps: number): number | null {
  if (!loadKg || reps <= 0 || loadKg <= 0) return null;
  if (reps === 1) return loadKg;
  return Math.round((loadKg * (1 + reps / 30)) * 100) / 100;
}

/**
 * Brzycki formula : 1RM = w × 36 / (37 - reps)
 * Plus fiable pour reps ≤ 10 (Mayhew 1992 review)
 */
export function estimate1RMBrzycki(loadKg: number, reps: number): number | null {
  if (!loadKg || reps <= 0 || loadKg <= 0 || reps >= 37) return null;
  if (reps === 1) return loadKg;
  return Math.round((loadKg * 36) / (37 - reps) * 100) / 100;
}

/**
 * Best estimate : Brzycki ≤ 10 reps, Epley > 10 reps
 * Aligné sur la logique SQL trigger
 */
export function estimate1RMBest(loadKg: number, reps: number): {
  value: number | null;
  method: 'actual' | 'epley' | 'brzycki';
} {
  if (reps === 1) return { value: loadKg, method: 'actual' };
  if (reps <= 10) {
    return { value: estimate1RMBrzycki(loadKg, reps), method: 'brzycki' };
  }
  return { value: estimate1RMEpley(loadKg, reps), method: 'epley' };
}

/**
 * Volume = load × reps (single set)
 */
export function setVolume(loadKg: number, reps: number): number {
  if (loadKg <= 0 || reps <= 0) return 0;
  return Math.round(loadKg * reps * 100) / 100;
}

/**
 * Pace en s/km depuis duration_s et distance_m
 */
export function calculatePaceSPerKm(durationS: number, distanceM: number): number | null {
  if (!durationS || !distanceM || distanceM < 1000) return null;
  return Math.round((durationS / (distanceM / 1000)) * 100) / 100;
}

/**
 * Speed en km/h
 */
export function calculateSpeedKmH(durationS: number, distanceM: number): number | null {
  if (!durationS || !distanceM) return null;
  return Math.round((distanceM / 1000) / (durationS / 3600) * 100) / 100;
}
