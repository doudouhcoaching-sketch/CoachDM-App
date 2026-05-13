// =====================================================================
// Coach DM · Phase 5 · Formatters
// =====================================================================

import type { Locale, PRCategory } from './types';

const SIGN = (n: number) => (n > 0 ? '+' : n < 0 ? '' : '±');

/**
 * Formate un delta de poids (kg) avec signe et précision
 */
export function formatWeightDelta(deltaKg: number | null, _locale: Locale = 'fr'): string {
  if (deltaKg === null || deltaKg === undefined || isNaN(deltaKg)) return '—';
  const sign = SIGN(deltaKg);
  return `${sign}${deltaKg.toFixed(1)} kg`;
}

/**
 * Formate un % de delta
 */
export function formatPctDelta(deltaPct: number | null): string {
  if (deltaPct === null || deltaPct === undefined || isNaN(deltaPct)) return '—';
  const sign = SIGN(deltaPct);
  return `${sign}${deltaPct.toFixed(1)}%`;
}

/**
 * Formate une mensuration (cm)
 */
export function formatMeasurement(cm: number | null): string {
  if (cm === null || cm === undefined || isNaN(cm)) return '—';
  return `${cm.toFixed(1)} cm`;
}

/**
 * Formate un body fat %
 */
export function formatBodyFat(pct: number | null): string {
  if (pct === null || pct === undefined || isNaN(pct)) return '—';
  return `${pct.toFixed(1)} %`;
}

/**
 * Formate une durée en s vers "Xh Ym Zs" ou "Ym Zs"
 */
export function formatDurationS(durationS: number | null): string {
  if (durationS === null || durationS === undefined || isNaN(durationS)) return '—';
  const h = Math.floor(durationS / 3600);
  const m = Math.floor((durationS % 3600) / 60);
  const s = Math.floor(durationS % 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

/**
 * Formate une distance en m vers "X km" ou "Y m"
 */
export function formatDistance(distanceM: number | null): string {
  if (distanceM === null || distanceM === undefined || isNaN(distanceM)) return '—';
  if (distanceM >= 1000) return `${(distanceM / 1000).toFixed(2)} km`;
  return `${Math.round(distanceM)} m`;
}

/**
 * Formate une allure en s/km vers "M:SS /km"
 */
export function formatPace(sPerKm: number | null): string {
  if (sPerKm === null || sPerKm === undefined || isNaN(sPerKm)) return '—';
  const m = Math.floor(sPerKm / 60);
  const s = Math.round(sPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')} /km`;
}

/**
 * Formate un PR selon sa catégorie
 */
export function formatPRValue(category: PRCategory, value: number, unit: string): string {
  switch (category) {
    case 'strength_1rm':
    case 'body_weight_min':
    case 'body_weight_max':
      return `${value.toFixed(1)} kg`;
    case 'strength_volume':
      return `${Math.round(value).toLocaleString('fr-FR')} kg`;
    case 'cardio_distance':
      return formatDistance(value);
    case 'cardio_duration':
      return formatDurationS(value);
    case 'cardio_pace':
      return formatPace(value);
    case 'cardio_hr_avg':
      return `${Math.round(value)} bpm`;
    case 'body_fat_min':
      return formatBodyFat(value);
    default:
      return `${value} ${unit}`;
  }
}

/**
 * Formate une date pour affichage
 */
export function formatDate(iso: string, locale: Locale = 'fr'): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const localeMap: Record<Locale, string> = { fr: 'fr-FR', en: 'en-GB', nl: 'nl-BE' };
  return d.toLocaleDateString(localeMap[locale], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formate un mois ("Mai 2026")
 */
export function formatMonth(iso: string, locale: Locale = 'fr'): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const localeMap: Record<Locale, string> = { fr: 'fr-FR', en: 'en-GB', nl: 'nl-BE' };
  return d.toLocaleDateString(localeMap[locale], { month: 'long', year: 'numeric' });
}
