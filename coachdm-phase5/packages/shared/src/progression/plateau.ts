// =====================================================================
// Coach DM · Phase 5 · Plateau detection
// Anticipation Phase 7 (IA Coach Assistant)
// Source : Helms et al. 2014 — minimum 2-3 semaines de stagnation
// avant d'ajuster le déficit/surplus calorique
// =====================================================================

import type { BodyMetricsWeekly, PlateauDetection, ProgressionInsight } from './types';

interface PlateauOptions {
  /** Nombre de semaines à considérer pour fenêtre récente (def 3) */
  recentWeeks?: number;
  /** Nombre de semaines à considérer pour fenêtre baseline (def 3) */
  baselineWeeks?: number;
  /** Seuil de variation considéré comme "stagnation" en kg (def 0.3kg) */
  stagnationThresholdKg?: number;
  /** Seuil en % du poids corporel (def 0.5%) */
  stagnationThresholdPct?: number;
  /** Objectif : 'cut' = on veut perdre, 'bulk' = on veut gagner, 'maintain' = stable */
  goal?: 'cut' | 'bulk' | 'maintain';
}

/**
 * Détecte un plateau sur une série de moyennes hebdo de poids
 * weekly[] doit être trié par week_start ASC, le plus récent en dernier
 */
export function computePlateauDetection(
  weekly: BodyMetricsWeekly[],
  options: PlateauOptions = {}
): PlateauDetection {
  const {
    recentWeeks = 3,
    baselineWeeks = 3,
    stagnationThresholdKg = 0.3,
    stagnationThresholdPct = 0.5,
    goal = 'maintain',
  } = options;

  const filtered = weekly
    .filter((w) => w.avg_weight_kg !== null)
    .sort((a, b) => a.week_start.localeCompare(b.week_start));

  const minRequired = recentWeeks + baselineWeeks;
  if (filtered.length < minRequired) {
    return {
      is_plateau: false,
      weeks_stagnant: 0,
      avg_weight_first_window: null,
      avg_weight_last_window: null,
      delta_kg: null,
      delta_pct: null,
      recommendation: null,
    };
  }

  const baseline = filtered.slice(-minRequired, -recentWeeks);
  const recent = filtered.slice(-recentWeeks);

  const avgBaseline =
    baseline.reduce((sum, w) => sum + (w.avg_weight_kg ?? 0), 0) / baseline.length;
  const avgRecent =
    recent.reduce((sum, w) => sum + (w.avg_weight_kg ?? 0), 0) / recent.length;

  const deltaKg = Math.round((avgRecent - avgBaseline) * 100) / 100;
  const deltaPct =
    avgBaseline > 0 ? Math.round((deltaKg / avgBaseline) * 10000) / 100 : 0;

  // Détermine si plateau selon objectif
  let isPlateau = false;
  if (goal === 'cut') {
    isPlateau = deltaKg >= -stagnationThresholdKg;
  } else if (goal === 'bulk') {
    isPlateau = deltaKg <= stagnationThresholdKg;
  } else {
    isPlateau = Math.abs(deltaPct) <= stagnationThresholdPct;
  }

  return {
    is_plateau: isPlateau,
    weeks_stagnant: isPlateau ? recentWeeks : 0,
    avg_weight_first_window: Math.round(avgBaseline * 100) / 100,
    avg_weight_last_window: Math.round(avgRecent * 100) / 100,
    delta_kg: deltaKg,
    delta_pct: deltaPct,
    recommendation: isPlateau ? buildPlateauInsight(goal, recentWeeks) : null,
  };
}

function buildPlateauInsight(
  goal: 'cut' | 'bulk' | 'maintain',
  weeks: number
): ProgressionInsight {
  if (goal === 'cut') {
    return {
      kind: 'warning',
      icon: '✗',
      title: {
        fr: `Plateau détecté (${weeks} semaines)`,
        en: `Plateau detected (${weeks} weeks)`,
        nl: `Plateau gedetecteerd (${weeks} weken)`,
      },
      body: {
        fr: 'Réduire le déficit de 100-200 kcal/jour ou ajouter une refeed hebdo. Vérifier sommeil et stress.',
        en: 'Reduce deficit by 100-200 kcal/day or add a weekly refeed. Check sleep and stress.',
        nl: 'Verminder tekort met 100-200 kcal/dag of voeg een wekelijkse refeed toe. Controleer slaap en stress.',
      },
      source: 'Helms 2014',
    };
  }
  if (goal === 'bulk') {
    return {
      kind: 'warning',
      icon: '✗',
      title: {
        fr: `Plateau détecté (${weeks} semaines)`,
        en: `Plateau detected (${weeks} weeks)`,
        nl: `Plateau gedetecteerd (${weeks} weken)`,
      },
      body: {
        fr: 'Augmenter les calories de 150-250 kcal/jour. Surveiller la qualité de la prise (% gras).',
        en: 'Increase calories by 150-250 kcal/day. Monitor quality of gain (body fat %).',
        nl: 'Verhoog calorieën met 150-250 kcal/dag. Bewaak kwaliteit van toename (vet%).',
      },
      source: 'Helms 2014',
    };
  }
  return {
    kind: 'info',
    icon: 'ⓘ',
    title: {
      fr: 'Poids stable',
      en: 'Weight stable',
      nl: 'Gewicht stabiel',
    },
    body: {
      fr: `Le poids est stable depuis ${weeks} semaines, en accord avec un objectif de maintien.`,
      en: `Weight has been stable for ${weeks} weeks, consistent with a maintenance goal.`,
      nl: `Gewicht is ${weeks} weken stabiel, consistent met een onderhoudsdoel.`,
    },
  };
}
