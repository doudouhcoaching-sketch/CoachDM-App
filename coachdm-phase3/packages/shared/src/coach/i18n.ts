// ============================================================
// Coach DM · Shared · i18n strings (Coach module · Phase 3)
// ============================================================
// FR priority, EN second, NL third (per Coach DM standards)

export type Locale = 'fr' | 'en' | 'nl';

export const coachI18n = {
  // ── Messaging ────────────────────────────────────────────
  messages: {
    title: { fr: 'Messages', en: 'Messages', nl: 'Berichten' },
    empty: {
      fr: 'Aucune conversation pour le moment',
      en: 'No conversations yet',
      nl: 'Nog geen gesprekken',
    },
    type_a_message: {
      fr: 'Écris un message…',
      en: 'Type a message…',
      nl: 'Typ een bericht…',
    },
    send: { fr: 'Envoyer', en: 'Send', nl: 'Verzenden' },
    you: { fr: 'Toi', en: 'You', nl: 'Jij' },
    coach: { fr: 'Coach', en: 'Coach', nl: 'Coach' },
    client: { fr: 'Client', en: 'Client', nl: 'Klant' },
    today: { fr: "Aujourd'hui", en: 'Today', nl: 'Vandaag' },
    yesterday: { fr: 'Hier', en: 'Yesterday', nl: 'Gisteren' },
    new_message: {
      fr: 'Nouveau message',
      en: 'New message',
      nl: 'Nieuw bericht',
    },
    attach_photo: {
      fr: 'Joindre une photo',
      en: 'Attach a photo',
      nl: 'Foto toevoegen',
    },
    delete_message: {
      fr: 'Supprimer le message',
      en: 'Delete message',
      nl: 'Bericht verwijderen',
    },
    unread: { fr: 'Non lus', en: 'Unread', nl: 'Ongelezen' },
  },

  // ── Check-ins ────────────────────────────────────────────
  checkIns: {
    title: { fr: 'Check-in', en: 'Check-in', nl: 'Check-in' },
    weekly_check_in: {
      fr: 'Check-in hebdomadaire',
      en: 'Weekly check-in',
      nl: 'Wekelijkse check-in',
    },
    pending_alert: {
      fr: 'Ton check-in de la semaine est prêt',
      en: 'Your weekly check-in is ready',
      nl: 'Je wekelijkse check-in staat klaar',
    },
    section_metrics: {
      fr: '📏 Mesures corporelles',
      en: '📏 Body measurements',
      nl: '📏 Lichaamsmaten',
    },
    section_feelings: {
      fr: '💭 Ressenti',
      en: '💭 How you feel',
      nl: '💭 Hoe je je voelt',
    },
    section_adherence: {
      fr: '✓ Suivi du programme',
      en: '✓ Program adherence',
      nl: '✓ Programmavolging',
    },
    section_photos: {
      fr: '📸 Photos progression',
      en: '📸 Progress photos',
      nl: '📸 Voortgangsfotos',
    },
    section_notes: {
      fr: '📝 Tes notes',
      en: '📝 Your notes',
      nl: '📝 Jouw notities',
    },
    weight: { fr: 'Poids (kg)', en: 'Weight (kg)', nl: 'Gewicht (kg)' },
    body_fat: { fr: '% Graisse', en: 'Body fat %', nl: 'Vetpercentage' },
    waist: { fr: 'Tour de taille (cm)', en: 'Waist (cm)', nl: 'Taille (cm)' },
    hips: { fr: 'Tour de hanches (cm)', en: 'Hips (cm)', nl: 'Heup (cm)' },
    chest: { fr: 'Tour de poitrine (cm)', en: 'Chest (cm)', nl: 'Borst (cm)' },
    arm: { fr: 'Tour de bras (cm)', en: 'Arm (cm)', nl: 'Arm (cm)' },
    thigh: { fr: 'Tour de cuisse (cm)', en: 'Thigh (cm)', nl: 'Dij (cm)' },
    energy: { fr: 'Énergie', en: 'Energy', nl: 'Energie' },
    sleep: { fr: 'Sommeil', en: 'Sleep', nl: 'Slaap' },
    stress: { fr: 'Stress', en: 'Stress', nl: 'Stress' },
    motivation: { fr: 'Motivation', en: 'Motivation', nl: 'Motivatie' },
    hunger: { fr: 'Faim', en: 'Hunger', nl: 'Honger' },
    soreness: { fr: 'Courbatures', en: 'Soreness', nl: 'Spierpijn' },
    workouts_completed: {
      fr: 'Séances réalisées',
      en: 'Workouts completed',
      nl: 'Voltooide trainingen',
    },
    nutrition_adherence: {
      fr: '% Plan nutrition respecté',
      en: '% Nutrition plan followed',
      nl: '% Voedingsplan gevolgd',
    },
    wins: {
      fr: 'Tes victoires de la semaine',
      en: 'Your wins this week',
      nl: 'Je successen deze week',
    },
    struggles: {
      fr: 'Tes difficultés',
      en: 'Your struggles',
      nl: 'Je moeilijkheden',
    },
    free_notes: {
      fr: 'Tout ce que tu veux ajouter',
      en: 'Anything else to add',
      nl: 'Iets anders om toe te voegen',
    },
    add_photo: {
      fr: 'Ajouter une photo',
      en: 'Add a photo',
      nl: 'Foto toevoegen',
    },
    pose_front: { fr: 'Face', en: 'Front', nl: 'Voorkant' },
    pose_side: { fr: 'Profil', en: 'Side', nl: 'Zijkant' },
    pose_back: { fr: 'Dos', en: 'Back', nl: 'Achterkant' },
    submit: {
      fr: 'Soumettre le check-in',
      en: 'Submit check-in',
      nl: 'Check-in indienen',
    },
    submitted: {
      fr: 'Check-in soumis · En attente du coach',
      en: 'Check-in submitted · Waiting for coach review',
      nl: 'Check-in ingediend · Wacht op coach review',
    },
    coach_feedback: {
      fr: 'Retour du coach',
      en: 'Coach feedback',
      nl: 'Coach feedback',
    },
    coach_action_items: {
      fr: 'Actions à mettre en place',
      en: 'Action items',
      nl: 'Actiepunten',
    },
    history: {
      fr: 'Historique',
      en: 'History',
      nl: 'Geschiedenis',
    },
  },

  // ── Coach dashboard ──────────────────────────────────────
  coachDash: {
    title: {
      fr: 'Tableau de bord coach',
      en: 'Coach dashboard',
      nl: 'Coach dashboard',
    },
    my_clients: {
      fr: 'Mes clients',
      en: 'My clients',
      nl: 'Mijn klanten',
    },
    pending_reviews: {
      fr: 'Check-ins à valider',
      en: 'Check-ins to review',
      nl: 'Check-ins te beoordelen',
    },
    new_messages: {
      fr: 'Nouveaux messages',
      en: 'New messages',
      nl: 'Nieuwe berichten',
    },
    assign_program: {
      fr: 'Assigner un programme',
      en: 'Assign a program',
      nl: 'Programma toewijzen',
    },
    add_client: {
      fr: 'Ajouter un client',
      en: 'Add a client',
      nl: 'Klant toevoegen',
    },
    no_clients: {
      fr: "Tu n'as pas encore de clients",
      en: 'No clients yet',
      nl: 'Nog geen klanten',
    },
    review: { fr: 'Examiner', en: 'Review', nl: 'Bekijken' },
    archive: { fr: 'Archiver', en: 'Archive', nl: 'Archiveren' },
    pause: { fr: 'Mettre en pause', en: 'Pause', nl: 'Pauzeren' },
    resume: { fr: 'Reprendre', en: 'Resume', nl: 'Hervatten' },
  },

  // ── Plans ────────────────────────────────────────────────
  plans: {
    title: {
      fr: 'Plans assignés',
      en: 'Assigned plans',
      nl: 'Toegewezen plannen',
    },
    active_plan: {
      fr: 'Plan actif',
      en: 'Active plan',
      nl: 'Actief plan',
    },
    no_active_plan: {
      fr: 'Aucun plan actif',
      en: 'No active plan',
      nl: 'Geen actief plan',
    },
    week: { fr: 'Semaine', en: 'Week', nl: 'Week' },
    duration_weeks: {
      fr: 'semaines',
      en: 'weeks',
      nl: 'weken',
    },
    start_date: {
      fr: 'Date de début',
      en: 'Start date',
      nl: 'Startdatum',
    },
    end_date: {
      fr: 'Date de fin',
      en: 'End date',
      nl: 'Einddatum',
    },
  },
} as const;

export function t(
  key: keyof typeof coachI18n,
  field: string,
  locale: Locale
): string {
  const section = coachI18n[key] as Record<string, Record<Locale, string>>;
  const node = section[field];
  if (!node) return field;
  return node[locale] ?? node.fr;
}
