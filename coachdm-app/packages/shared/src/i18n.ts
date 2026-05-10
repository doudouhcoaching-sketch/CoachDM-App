// ═══════════════════════════════════════════════════════════════
// COACH DM — i18n trilingue (FR priorité, EN, NL)
// 
// Approche : objet plat de traductions, fonction t() avec
// interpolation simple. Pas de dépendance lourde (i18next overkill
// pour notre besoin), parfait pour web + mobile sans config.
// ═══════════════════════════════════════════════════════════════

import type { LocaleCode, MealType, NutritionGoal, ActivityLevel } from './types';

export type TranslationKey = keyof typeof translations.fr;

const translations = {
  fr: {
    // Auth
    'auth.signin': 'Se connecter',
    'auth.signup': "S'inscrire",
    'auth.signout': 'Se déconnecter',
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.full_name': 'Nom complet',
    'auth.forgot_password': 'Mot de passe oublié ?',
    'auth.welcome_back': 'Bon retour, {name}',
    'auth.create_account': 'Créer un compte',

    // Onboarding
    'onboarding.welcome': 'Bienvenue chez Coach DM',
    'onboarding.subtitle': "Configurons votre programme nutrition en 1 minute",
    'onboarding.step_profile': 'Votre profil',
    'onboarding.step_body': 'Vos mesures',
    'onboarding.step_goal': 'Votre objectif',
    'onboarding.step_activity': 'Votre activité',
    'onboarding.continue': 'Continuer',
    'onboarding.back': 'Retour',
    'onboarding.finish': 'Terminer',

    // Profile fields
    'profile.sex': 'Sexe biologique',
    'profile.sex.male': 'Homme',
    'profile.sex.female': 'Femme',
    'profile.date_of_birth': 'Date de naissance',
    'profile.height': 'Taille (cm)',
    'profile.weight': 'Poids actuel (kg)',
    'profile.target_weight': 'Poids cible (kg)',
    'profile.body_fat': '% masse grasse (optionnel)',

    // Goals
    'goal.lose_fat': 'Perdre du gras',
    'goal.maintain': 'Maintenir',
    'goal.build_muscle': 'Prendre du muscle',
    'goal.recomp': 'Recomposition corporelle',

    // Activity levels
    'activity.sedentary': 'Sédentaire',
    'activity.sedentary.desc': 'Bureau, peu d\'exercice',
    'activity.light': 'Légère',
    'activity.light.desc': '1-3 séances/semaine',
    'activity.moderate': 'Modérée',
    'activity.moderate.desc': '3-5 séances/semaine',
    'activity.active': 'Active',
    'activity.active.desc': '6-7 séances/semaine',
    'activity.very_active': 'Très active',
    'activity.very_active.desc': 'Athlète, 2 séances/jour',

    // Nutrition dashboard
    'nutrition.today': "Aujourd'hui",
    'nutrition.calories': 'Calories',
    'nutrition.protein': 'Protéines',
    'nutrition.carbs': 'Glucides',
    'nutrition.fat': 'Lipides',
    'nutrition.fiber': 'Fibres',
    'nutrition.water': 'Eau',
    'nutrition.remaining': 'Restantes',
    'nutrition.consumed': 'Consommées',
    'nutrition.target': 'Objectif',
    'nutrition.add_food': 'Ajouter un aliment',
    'nutrition.scan_barcode': 'Scanner un code-barres',
    'nutrition.search': 'Rechercher',
    'nutrition.recent': 'Récents',
    'nutrition.favorites': 'Favoris',

    // Meals
    'meal.breakfast': 'Petit-déjeuner',
    'meal.lunch': 'Déjeuner',
    'meal.dinner': 'Dîner',
    'meal.snack': 'Collation',
    'meal.pre_workout': 'Avant entraînement',
    'meal.post_workout': 'Après entraînement',

    // Units
    'unit.kcal': 'kcal',
    'unit.g': 'g',
    'unit.kg': 'kg',
    'unit.cm': 'cm',
    'unit.ml': 'ml',
    'unit.percent': '%',

    // Common
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.loading': 'Chargement...',
    'common.error': 'Une erreur est survenue',
    'common.retry': 'Réessayer',
    'common.confirm': 'Confirmer',
    'common.required': 'Requis',
    'common.optional': 'Optionnel',

    // Subscription
    'sub.title': 'Coach DM Premium',
    'sub.price': '19,99 € / mois',
    'sub.trial': '7 jours gratuits',
    'sub.cta_start': "Démarrer l'essai gratuit",
    'sub.cta_subscribe': "S'abonner",
    'sub.feature_1': 'Tracking nutrition complet',
    'sub.feature_2': 'Scanner code-barres illimité',
    'sub.feature_3': 'Plans adaptés science-based',
    'sub.feature_4': 'Annulation à tout moment',
  },

  en: {
    'auth.signin': 'Sign in',
    'auth.signup': 'Sign up',
    'auth.signout': 'Sign out',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.full_name': 'Full name',
    'auth.forgot_password': 'Forgot password?',
    'auth.welcome_back': 'Welcome back, {name}',
    'auth.create_account': 'Create account',

    'onboarding.welcome': 'Welcome to Coach DM',
    'onboarding.subtitle': "Let's set up your nutrition plan in 1 minute",
    'onboarding.step_profile': 'Your profile',
    'onboarding.step_body': 'Your measurements',
    'onboarding.step_goal': 'Your goal',
    'onboarding.step_activity': 'Your activity',
    'onboarding.continue': 'Continue',
    'onboarding.back': 'Back',
    'onboarding.finish': 'Finish',

    'profile.sex': 'Biological sex',
    'profile.sex.male': 'Male',
    'profile.sex.female': 'Female',
    'profile.date_of_birth': 'Date of birth',
    'profile.height': 'Height (cm)',
    'profile.weight': 'Current weight (kg)',
    'profile.target_weight': 'Target weight (kg)',
    'profile.body_fat': 'Body fat % (optional)',

    'goal.lose_fat': 'Lose fat',
    'goal.maintain': 'Maintain',
    'goal.build_muscle': 'Build muscle',
    'goal.recomp': 'Body recomposition',

    'activity.sedentary': 'Sedentary',
    'activity.sedentary.desc': 'Office, little exercise',
    'activity.light': 'Light',
    'activity.light.desc': '1-3 sessions/week',
    'activity.moderate': 'Moderate',
    'activity.moderate.desc': '3-5 sessions/week',
    'activity.active': 'Active',
    'activity.active.desc': '6-7 sessions/week',
    'activity.very_active': 'Very active',
    'activity.very_active.desc': 'Athlete, 2 sessions/day',

    'nutrition.today': 'Today',
    'nutrition.calories': 'Calories',
    'nutrition.protein': 'Protein',
    'nutrition.carbs': 'Carbs',
    'nutrition.fat': 'Fat',
    'nutrition.fiber': 'Fiber',
    'nutrition.water': 'Water',
    'nutrition.remaining': 'Remaining',
    'nutrition.consumed': 'Consumed',
    'nutrition.target': 'Target',
    'nutrition.add_food': 'Add food',
    'nutrition.scan_barcode': 'Scan barcode',
    'nutrition.search': 'Search',
    'nutrition.recent': 'Recent',
    'nutrition.favorites': 'Favorites',

    'meal.breakfast': 'Breakfast',
    'meal.lunch': 'Lunch',
    'meal.dinner': 'Dinner',
    'meal.snack': 'Snack',
    'meal.pre_workout': 'Pre-workout',
    'meal.post_workout': 'Post-workout',

    'unit.kcal': 'kcal',
    'unit.g': 'g',
    'unit.kg': 'kg',
    'unit.cm': 'cm',
    'unit.ml': 'ml',
    'unit.percent': '%',

    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.retry': 'Retry',
    'common.confirm': 'Confirm',
    'common.required': 'Required',
    'common.optional': 'Optional',

    'sub.title': 'Coach DM Premium',
    'sub.price': '€19.99 / month',
    'sub.trial': '7 days free',
    'sub.cta_start': 'Start free trial',
    'sub.cta_subscribe': 'Subscribe',
    'sub.feature_1': 'Full nutrition tracking',
    'sub.feature_2': 'Unlimited barcode scanning',
    'sub.feature_3': 'Science-based plans',
    'sub.feature_4': 'Cancel anytime',
  },

  nl: {
    'auth.signin': 'Inloggen',
    'auth.signup': 'Aanmelden',
    'auth.signout': 'Uitloggen',
    'auth.email': 'E-mail',
    'auth.password': 'Wachtwoord',
    'auth.full_name': 'Volledige naam',
    'auth.forgot_password': 'Wachtwoord vergeten?',
    'auth.welcome_back': 'Welkom terug, {name}',
    'auth.create_account': 'Account aanmaken',

    'onboarding.welcome': 'Welkom bij Coach DM',
    'onboarding.subtitle': 'Stel je voedingsplan in 1 minuut in',
    'onboarding.step_profile': 'Jouw profiel',
    'onboarding.step_body': 'Jouw metingen',
    'onboarding.step_goal': 'Jouw doel',
    'onboarding.step_activity': 'Jouw activiteit',
    'onboarding.continue': 'Doorgaan',
    'onboarding.back': 'Terug',
    'onboarding.finish': 'Voltooien',

    'profile.sex': 'Biologisch geslacht',
    'profile.sex.male': 'Man',
    'profile.sex.female': 'Vrouw',
    'profile.date_of_birth': 'Geboortedatum',
    'profile.height': 'Lengte (cm)',
    'profile.weight': 'Huidig gewicht (kg)',
    'profile.target_weight': 'Streefgewicht (kg)',
    'profile.body_fat': 'Vetpercentage (optioneel)',

    'goal.lose_fat': 'Vet verliezen',
    'goal.maintain': 'Behouden',
    'goal.build_muscle': 'Spiermassa opbouwen',
    'goal.recomp': 'Lichaamsrecompositie',

    'activity.sedentary': 'Zittend',
    'activity.sedentary.desc': 'Kantoor, weinig beweging',
    'activity.light': 'Licht',
    'activity.light.desc': '1-3 sessies/week',
    'activity.moderate': 'Matig',
    'activity.moderate.desc': '3-5 sessies/week',
    'activity.active': 'Actief',
    'activity.active.desc': '6-7 sessies/week',
    'activity.very_active': 'Zeer actief',
    'activity.very_active.desc': 'Atleet, 2 sessies/dag',

    'nutrition.today': 'Vandaag',
    'nutrition.calories': 'Calorieën',
    'nutrition.protein': 'Eiwitten',
    'nutrition.carbs': 'Koolhydraten',
    'nutrition.fat': 'Vetten',
    'nutrition.fiber': 'Vezels',
    'nutrition.water': 'Water',
    'nutrition.remaining': 'Resterend',
    'nutrition.consumed': 'Geconsumeerd',
    'nutrition.target': 'Doel',
    'nutrition.add_food': 'Voedsel toevoegen',
    'nutrition.scan_barcode': 'Streepjescode scannen',
    'nutrition.search': 'Zoeken',
    'nutrition.recent': 'Recent',
    'nutrition.favorites': 'Favorieten',

    'meal.breakfast': 'Ontbijt',
    'meal.lunch': 'Lunch',
    'meal.dinner': 'Avondeten',
    'meal.snack': 'Tussendoortje',
    'meal.pre_workout': 'Voor training',
    'meal.post_workout': 'Na training',

    'unit.kcal': 'kcal',
    'unit.g': 'g',
    'unit.kg': 'kg',
    'unit.cm': 'cm',
    'unit.ml': 'ml',
    'unit.percent': '%',

    'common.save': 'Opslaan',
    'common.cancel': 'Annuleren',
    'common.delete': 'Verwijderen',
    'common.edit': 'Bewerken',
    'common.loading': 'Laden...',
    'common.error': 'Er is een fout opgetreden',
    'common.retry': 'Opnieuw proberen',
    'common.confirm': 'Bevestigen',
    'common.required': 'Vereist',
    'common.optional': 'Optioneel',

    'sub.title': 'Coach DM Premium',
    'sub.price': '€ 19,99 / maand',
    'sub.trial': '7 dagen gratis',
    'sub.cta_start': 'Start gratis proefperiode',
    'sub.cta_subscribe': 'Abonneren',
    'sub.feature_1': 'Volledige voedingsregistratie',
    'sub.feature_2': 'Onbeperkt streepjescode scannen',
    'sub.feature_3': 'Wetenschappelijk onderbouwd',
    'sub.feature_4': 'Op elk moment opzegbaar',
  },
} as const;

/**
 * Traduit une clé. Supporte l'interpolation {var}.
 * Fallback : si la clé manque dans la locale, retourne le FR.
 */
export function t(
  key: TranslationKey,
  locale: LocaleCode = 'fr',
  vars?: Record<string, string | number>,
): string {
  const dict = translations[locale] ?? translations.fr;
  let str: string = (dict[key] ?? translations.fr[key] ?? key) as string;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}

/**
 * Helper : retourne le nom traduit d'une food selon la locale.
 */
export function localizeFoodName(
  food: { name_fr: string; name_en: string | null; name_nl: string | null },
  locale: LocaleCode,
): string {
  if (locale === 'en' && food.name_en) return food.name_en;
  if (locale === 'nl' && food.name_nl) return food.name_nl;
  return food.name_fr;
}

export function localizeMealType(meal: MealType, locale: LocaleCode): string {
  return t(`meal.${meal}` as TranslationKey, locale);
}

export function localizeGoal(goal: NutritionGoal, locale: LocaleCode): string {
  return t(`goal.${goal}` as TranslationKey, locale);
}

export function localizeActivity(level: ActivityLevel, locale: LocaleCode): string {
  return t(`activity.${level}` as TranslationKey, locale);
}

export const SUPPORTED_LOCALES: LocaleCode[] = ['fr', 'en', 'nl'];

export function detectLocale(
  preferred: string | null | undefined,
  fallback: LocaleCode = 'fr',
): LocaleCode {
  if (!preferred) return fallback;
  const code = preferred.toLowerCase().slice(0, 2);
  if (SUPPORTED_LOCALES.includes(code as LocaleCode)) {
    return code as LocaleCode;
  }
  return fallback;
}
