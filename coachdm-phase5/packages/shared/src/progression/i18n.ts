// =====================================================================
// Coach DM · Phase 5 · i18n FR/EN/NL
// FR priorité > EN > NL
// =====================================================================

import type { Locale } from './types';

export const i18n = {
  // Navigation
  progression: {
    fr: 'Progression',
    en: 'Progress',
    nl: 'Voortgang',
  },
  dashboard: {
    fr: 'Tableau de bord',
    en: 'Dashboard',
    nl: 'Dashboard',
  },
  // Body
  weight: { fr: 'Poids', en: 'Weight', nl: 'Gewicht' },
  body_fat: { fr: 'Masse grasse', en: 'Body fat', nl: 'Vetpercentage' },
  muscle_mass: { fr: 'Masse musculaire', en: 'Muscle mass', nl: 'Spiermassa' },
  measurements: { fr: 'Mensurations', en: 'Measurements', nl: 'Maten' },
  neck: { fr: 'Cou', en: 'Neck', nl: 'Nek' },
  chest: { fr: 'Poitrine', en: 'Chest', nl: 'Borst' },
  waist: { fr: 'Taille', en: 'Waist', nl: 'Taille' },
  hips: { fr: 'Hanches', en: 'Hips', nl: 'Heupen' },
  biceps_left: { fr: 'Biceps gauche', en: 'Left biceps', nl: 'Linker biceps' },
  biceps_right: { fr: 'Biceps droit', en: 'Right biceps', nl: 'Rechter biceps' },
  thigh_left: { fr: 'Cuisse gauche', en: 'Left thigh', nl: 'Linker dij' },
  thigh_right: { fr: 'Cuisse droite', en: 'Right thigh', nl: 'Rechter dij' },
  calf_left: { fr: 'Mollet gauche', en: 'Left calf', nl: 'Linker kuit' },
  calf_right: { fr: 'Mollet droit', en: 'Right calf', nl: 'Rechter kuit' },

  // Charts
  last_30_days: { fr: '30 derniers jours', en: 'Last 30 days', nl: 'Laatste 30 dagen' },
  last_3_months: { fr: '3 derniers mois', en: 'Last 3 months', nl: 'Laatste 3 maanden' },
  last_year: { fr: '12 derniers mois', en: 'Last 12 months', nl: 'Laatste 12 maanden' },
  all_time: { fr: 'Tout', en: 'All time', nl: 'Alles' },

  // PRs
  personal_records: { fr: 'Records personnels', en: 'Personal records', nl: 'Persoonlijke records' },
  pr_strength: { fr: 'Force', en: 'Strength', nl: 'Kracht' },
  pr_cardio: { fr: 'Cardio', en: 'Cardio', nl: 'Cardio' },
  pr_body: { fr: 'Composition', en: 'Body composition', nl: 'Lichaamssamenstelling' },
  pr_1rm: { fr: '1RM estimé', en: 'Estimated 1RM', nl: 'Geschatte 1RM' },
  pr_volume: { fr: 'Volume', en: 'Volume', nl: 'Volume' },
  pr_distance: { fr: 'Distance', en: 'Distance', nl: 'Afstand' },
  pr_duration: { fr: 'Durée', en: 'Duration', nl: 'Duur' },
  pr_pace: { fr: 'Allure', en: 'Pace', nl: 'Tempo' },
  pr_weight_min: { fr: 'Poids minimum', en: 'Minimum weight', nl: 'Minimum gewicht' },
  pr_weight_max: { fr: 'Poids maximum', en: 'Maximum weight', nl: 'Maximum gewicht' },
  pr_bf_min: { fr: 'Masse grasse min', en: 'Minimum body fat', nl: 'Minimum vetpercentage' },
  no_prs_yet: {
    fr: 'Aucun record encore. Continue à enregistrer tes séances.',
    en: 'No records yet. Keep logging your workouts.',
    nl: 'Nog geen records. Blijf je trainingen registreren.',
  },
  new_pr: { fr: 'Nouveau record !', en: 'New record!', nl: 'Nieuw record!' },
  previous: { fr: 'Précédent', en: 'Previous', nl: 'Vorige' },

  // Activity calendar
  activity_calendar: { fr: 'Calendrier d\'activité', en: 'Activity calendar', nl: 'Activiteitenkalender' },
  legend_less: { fr: 'Moins', en: 'Less', nl: 'Minder' },
  legend_more: { fr: 'Plus', en: 'More', nl: 'Meer' },
  total_active_days: { fr: 'Jours actifs', en: 'Active days', nl: 'Actieve dagen' },
  current_streak: { fr: 'Série actuelle', en: 'Current streak', nl: 'Huidige reeks' },

  // Photos
  progress_photos: { fr: 'Photos de progression', en: 'Progress photos', nl: 'Voortgangsfoto\'s' },
  add_photo: { fr: 'Ajouter une photo', en: 'Add photo', nl: 'Foto toevoegen' },
  pose_front: { fr: 'Face', en: 'Front', nl: 'Voorkant' },
  pose_side_left: { fr: 'Profil gauche', en: 'Left side', nl: 'Linkerzijde' },
  pose_side_right: { fr: 'Profil droit', en: 'Right side', nl: 'Rechterzijde' },
  pose_back: { fr: 'Dos', en: 'Back', nl: 'Achterkant' },
  pose_custom: { fr: 'Autre', en: 'Custom', nl: 'Aangepast' },
  comparison: { fr: 'Comparaison', en: 'Comparison', nl: 'Vergelijking' },
  before: { fr: 'Avant', en: 'Before', nl: 'Voor' },
  after: { fr: 'Après', en: 'After', nl: 'Na' },
  slider_view: { fr: 'Slider', en: 'Slider', nl: 'Schuifregelaar' },
  timeline_view: { fr: 'Timeline', en: 'Timeline', nl: 'Tijdlijn' },
  visible_to_coach: { fr: 'Visible par le coach', en: 'Visible to coach', nl: 'Zichtbaar voor coach' },
  save_comparison: { fr: 'Sauvegarder comparaison', en: 'Save comparison', nl: 'Vergelijking opslaan' },

  // Monthly report
  monthly_report: { fr: 'Rapport mensuel', en: 'Monthly report', nl: 'Maandrapport' },
  generate_pdf: { fr: 'Générer le PDF', en: 'Generate PDF', nl: 'PDF genereren' },
  share: { fr: 'Partager', en: 'Share', nl: 'Delen' },
  report_subtitle: {
    fr: 'Bilan complet · Coach DM',
    en: 'Complete summary · Coach DM',
    nl: 'Volledig overzicht · Coach DM',
  },

  // Plateau
  plateau_detected: { fr: 'Plateau détecté', en: 'Plateau detected', nl: 'Plateau gedetecteerd' },

  // Common
  loading: { fr: 'Chargement…', en: 'Loading…', nl: 'Laden…' },
  empty_state: { fr: 'Aucune donnée', en: 'No data', nl: 'Geen data' },
  save: { fr: 'Enregistrer', en: 'Save', nl: 'Opslaan' },
  cancel: { fr: 'Annuler', en: 'Cancel', nl: 'Annuleren' },
  delete: { fr: 'Supprimer', en: 'Delete', nl: 'Verwijderen' },
  back: { fr: 'Retour', en: 'Back', nl: 'Terug' },
  see_all: { fr: 'Voir tout', en: 'See all', nl: 'Alles bekijken' },
  kg: { fr: 'kg', en: 'kg', nl: 'kg' },
  cm: { fr: 'cm', en: 'cm', nl: 'cm' },
  reps: { fr: 'reps', en: 'reps', nl: 'herhalingen' },

  // Footer
  brand: { fr: 'Coach DM', en: 'Coach DM', nl: 'Coach DM' },

  // Activity stats (used in dashboard + monthly report)
  workouts: { fr: 'Séances', en: 'Workouts', nl: 'Trainingen' },
  cardio: { fr: 'Cardio', en: 'Cardio', nl: 'Cardio' },
} as const;

export type I18nKey = keyof typeof i18n;

export function t(key: I18nKey, locale: Locale = 'fr'): string {
  const entry = i18n[key];
  if (!entry) return String(key);
  return entry[locale] ?? entry.fr;
}
