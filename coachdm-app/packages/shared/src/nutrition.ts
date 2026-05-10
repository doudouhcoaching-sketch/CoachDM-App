// ═══════════════════════════════════════════════════════════════
// COACH DM — Calculs nutrition science-based
// 
// Sources :
// - Mifflin-St Jeor (1990) — BMR la plus précise pour pop. moderne
//   Mifflin MD et al. Am J Clin Nutr. 1990;51(2):241-7.
// - Katch-McArdle — BMR ajustée à la masse maigre (si %BF connu)
// - ISSN Position Stand on Protein and Exercise (Jäger 2017)
// - Helms et al. (2014) — Recommendations for natural bodybuilders
// ═══════════════════════════════════════════════════════════════

import type {
  ActivityLevel,
  BiologicalSex,
  MacroBreakdown,
  NutritionGoal,
} from './types';

// ── Constantes ─────────────────────────────────────────────────

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,        // Bureau, peu/pas d'exercice
  light: 1.375,          // 1-3 séances/sem
  moderate: 1.55,        // 3-5 séances/sem
  active: 1.725,         // 6-7 séances/sem
  very_active: 1.9,      // Athlète, physique + sport intense
};

export const KCAL_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
  alcohol: 7,
} as const;

// ── BMR (Mifflin-St Jeor) ──────────────────────────────────────
/**
 * Métabolisme de base — formule Mifflin-St Jeor.
 * Plus précise que Harris-Benedict pour la population moderne.
 * 
 * Hommes : 10 × poids(kg) + 6.25 × taille(cm) − 5 × âge + 5
 * Femmes : 10 × poids(kg) + 6.25 × taille(cm) − 5 × âge − 161
 */
export function calculateBMRMifflin(params: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: BiologicalSex;
}): number {
  const { weightKg, heightCm, ageYears, sex } = params;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

// ── BMR (Katch-McArdle, si %BF connu) ──────────────────────────
/**
 * BMR basée sur la masse maigre. Plus précise si on connaît
 * le pourcentage de masse grasse (mesure à l'impédancemètre, DEXA, plis cutanés).
 * 
 * BMR = 370 + 21.6 × LBM(kg)
 */
export function calculateBMRKatchMcArdle(params: {
  weightKg: number;
  bodyFatPercentage: number;
}): number {
  const { weightKg, bodyFatPercentage } = params;
  const leanMassKg = weightKg * (1 - bodyFatPercentage / 100);
  return Math.round(370 + 21.6 * leanMassKg);
}

// ── TDEE ───────────────────────────────────────────────────────
/**
 * Total Daily Energy Expenditure : BMR × multiplicateur d'activité.
 */
export function calculateTDEE(bmrKcal: number, activityLevel: ActivityLevel): number {
  return Math.round(bmrKcal * ACTIVITY_MULTIPLIERS[activityLevel]);
}

// ── Calorie target selon objectif ──────────────────────────────
/**
 * Ajustement calorique selon l'objectif.
 * 
 * - Lose fat : déficit de 20% (sustainable, préserve la masse maigre)
 * - Maintain : 0%
 * - Build muscle : surplus de 10% (lean bulk, limite la prise de gras)
 * - Recomp : maintien (perte gras + gain muscle simultané, lent mais durable)
 * 
 * Garde-fou : jamais en-dessous de BMR × 1.0 (sécurité physiologique).
 */
export function calculateDailyCalories(params: {
  tdeeKcal: number;
  bmrKcal: number;
  goal: NutritionGoal;
}): number {
  const { tdeeKcal, bmrKcal, goal } = params;
  let target: number;
  switch (goal) {
    case 'lose_fat':
      target = tdeeKcal * 0.8;
      break;
    case 'maintain':
      target = tdeeKcal;
      break;
    case 'build_muscle':
      target = tdeeKcal * 1.1;
      break;
    case 'recomp':
      target = tdeeKcal;
      break;
  }
  // Sécurité : jamais en dessous du BMR
  return Math.round(Math.max(target, bmrKcal));
}

// ── Macros ─────────────────────────────────────────────────────
/**
 * Répartition macros adaptée à l'objectif et au poids corporel.
 * 
 * PROTÉINES (g/kg de poids) — basé sur ISSN Position Stand 2017 :
 * - Lose fat : 2.2 g/kg (préservation masse maigre en déficit)
 * - Maintain : 1.8 g/kg
 * - Build muscle : 2.0 g/kg
 * - Recomp : 2.4 g/kg (high protein optimal)
 * 
 * LIPIDES : 25-30% des calories totales (santé hormonale,
 * minimum 0.8 g/kg pour testostérone optimale chez l'homme).
 * 
 * GLUCIDES : le reste des calories (carburant entraînement).
 * 
 * FIBRES : 14g / 1000 kcal (recommandation FDA).
 */
export function calculateMacros(params: {
  dailyCaloriesKcal: number;
  weightKg: number;
  goal: NutritionGoal;
}): MacroBreakdown {
  const { dailyCaloriesKcal, weightKg, goal } = params;

  // Protéines (g/kg)
  const proteinPerKg: Record<NutritionGoal, number> = {
    lose_fat: 2.2,
    maintain: 1.8,
    build_muscle: 2.0,
    recomp: 2.4,
  };
  const protein_g = Math.round(weightKg * proteinPerKg[goal]);

  // Lipides : 27.5% des calories en moyenne (entre 25 et 30%)
  const fatPercentage = goal === 'lose_fat' ? 0.30 : 0.275;
  const fat_g = Math.round((dailyCaloriesKcal * fatPercentage) / KCAL_PER_GRAM.fat);

  // Glucides = reste
  const proteinKcal = protein_g * KCAL_PER_GRAM.protein;
  const fatKcal = fat_g * KCAL_PER_GRAM.fat;
  const carbsKcal = Math.max(0, dailyCaloriesKcal - proteinKcal - fatKcal);
  const carbs_g = Math.round(carbsKcal / KCAL_PER_GRAM.carbs);

  // Fibres (FDA : 14g / 1000 kcal)
  const fiber_g = Math.round((dailyCaloriesKcal / 1000) * 14);

  return {
    kcal: dailyCaloriesKcal,
    protein_g,
    carbs_g,
    fat_g,
    fiber_g,
  };
}

// ── Hydratation ────────────────────────────────────────────────
/**
 * Cible hydratation quotidienne (ml).
 * 35 ml / kg base + 500 ml par heure d'entraînement.
 * (American College of Sports Medicine 2007.)
 */
export function calculateWaterTarget(params: {
  weightKg: number;
  activityLevel: ActivityLevel;
}): number {
  const { weightKg, activityLevel } = params;
  const base = weightKg * 35;
  const activityBonus: Record<ActivityLevel, number> = {
    sedentary: 0,
    light: 250,
    moderate: 500,
    active: 750,
    very_active: 1000,
  };
  return Math.round(base + activityBonus[activityLevel]);
}

// ── Calcul complet (orchestrateur) ─────────────────────────────
/**
 * Calcule tout d'un coup : BMR → TDEE → calories → macros → eau.
 * Utilise Katch-McArdle si bodyFat est fourni, sinon Mifflin-St Jeor.
 */
export function calculateNutritionTargets(params: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: BiologicalSex;
  activityLevel: ActivityLevel;
  goal: NutritionGoal;
  bodyFatPercentage?: number | null;
}): {
  bmr: number;
  tdee: number;
  daily_calories: number;
  macros: MacroBreakdown;
  water_ml: number;
  method: 'mifflin_st_jeor' | 'katch_mcardle';
} {
  const { weightKg, heightCm, ageYears, sex, activityLevel, goal, bodyFatPercentage } = params;

  const useKatch = bodyFatPercentage != null && bodyFatPercentage >= 3 && bodyFatPercentage <= 60;

  const bmr = useKatch
    ? calculateBMRKatchMcArdle({ weightKg, bodyFatPercentage: bodyFatPercentage! })
    : calculateBMRMifflin({ weightKg, heightCm, ageYears, sex });

  const tdee = calculateTDEE(bmr, activityLevel);
  const daily_calories = calculateDailyCalories({ tdeeKcal: tdee, bmrKcal: bmr, goal });
  const macros = calculateMacros({ dailyCaloriesKcal: daily_calories, weightKg, goal });
  const water_ml = calculateWaterTarget({ weightKg, activityLevel });

  return {
    bmr,
    tdee,
    daily_calories,
    macros,
    water_ml,
    method: useKatch ? 'katch_mcardle' : 'mifflin_st_jeor',
  };
}

// ── Helpers ────────────────────────────────────────────────────
/**
 * Calcule les macros consommées pour une portion d'aliment.
 * @param food - Food avec valeurs pour 100g
 * @param quantityG - Quantité consommée en grammes
 */
export function computeFoodMacros(
  food: {
    kcal_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
    fiber_per_100g: number | null;
  },
  quantityG: number,
): MacroBreakdown {
  const ratio = quantityG / 100;
  return {
    kcal: Math.round(food.kcal_per_100g * ratio * 10) / 10,
    protein_g: Math.round(food.protein_per_100g * ratio * 10) / 10,
    carbs_g: Math.round(food.carbs_per_100g * ratio * 10) / 10,
    fat_g: Math.round(food.fat_per_100g * ratio * 10) / 10,
    fiber_g: Math.round((food.fiber_per_100g ?? 0) * ratio * 10) / 10,
  };
}

/**
 * Calcule l'âge à partir de la date de naissance.
 */
export function calculateAge(dateOfBirth: string | Date): number {
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * % de l'objectif atteint, plafonné à 100 pour les jauges UI.
 */
export function progressPercentage(consumed: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((consumed / target) * 100));
}

/**
 * Calories restantes (peut être négatif si dépassement).
 */
export function caloriesRemaining(consumed: number, target: number): number {
  return Math.round(target - consumed);
}
