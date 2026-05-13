// =====================================================================
// COACH DM · APP · PHASE 7 — IA COACH ASSISTANT
// packages/shared/src/ai/i18n.ts
// Trilingue FR (priorité) / EN / NL — ~140 clés.
// =====================================================================

import type { Lang } from './types';

export const aiI18n = {
  // ---- Navigation / écrans ----
  'ai.tab.chat':                 { fr: 'Coach IA',          en: 'AI Coach',         nl: 'AI Coach' },
  'ai.tab.suggestions':          { fr: 'Suggestions',       en: 'Suggestions',      nl: 'Suggesties' },
  'ai.tab.recovery':             { fr: 'Récupération',      en: 'Recovery',         nl: 'Herstel' },
  'ai.tab.plateau':              { fr: 'Plateaux',          en: 'Plateaus',         nl: 'Plateaus' },
  'ai.tab.adjustments':          { fr: 'Ajustements',       en: 'Adjustments',      nl: 'Aanpassingen' },

  // ---- Chat ----
  'ai.chat.title':               { fr: 'Coach IA',          en: 'AI Coach',         nl: 'AI Coach' },
  'ai.chat.placeholder':         { fr: 'Pose ta question…',    en: 'Ask anything…',          nl: 'Stel je vraag…' },
  'ai.chat.send':                { fr: 'Envoyer',           en: 'Send',             nl: 'Verzenden' },
  'ai.chat.thinking':            { fr: 'Le coach réfléchit…',  en: 'Coach is thinking…',     nl: 'Coach denkt na…' },
  'ai.chat.new':                 { fr: 'Nouvelle conversation', en: 'New conversation',     nl: 'Nieuw gesprek' },
  'ai.chat.empty.title':         { fr: 'Ton coach IA est prêt', en: 'Your AI coach is ready', nl: 'Je AI-coach staat klaar' },
  'ai.chat.empty.body':          {
    fr: 'Demande un ajustement de programme, une analyse de plateau, une séance adaptée à ta fatigue, ou un protocole de récupération.',
    en: 'Ask for a program tweak, a plateau check, a fatigue-adapted session, or a recovery protocol.',
    nl: 'Vraag om programma-aanpassing, plateau-analyse, vermoeidheid-aangepaste sessie of herstelprotocol.',
  },
  'ai.chat.quick.adjust':        { fr: 'Ajuste mon programme',     en: 'Adjust my program',          nl: 'Pas mijn programma aan' },
  'ai.chat.quick.plateau':       { fr: 'Suis-je en plateau ?',     en: 'Am I plateauing?',            nl: 'Zit ik op een plateau?' },
  'ai.chat.quick.session':       { fr: 'Quelle séance aujourd\'hui ?', en: 'What session today?',     nl: 'Welke sessie vandaag?' },
  'ai.chat.quick.recovery':      { fr: 'Protocole récupération',   en: 'Recovery protocol',           nl: 'Herstelprotocol' },
  'ai.chat.tool.context':        { fr: 'Lecture du contexte client', en: 'Reading client context',    nl: 'Cliëntcontext lezen' },
  'ai.chat.tool.plateau':        { fr: 'Analyse plateau',          en: 'Plateau analysis',            nl: 'Plateauanalyse' },
  'ai.chat.tool.adjust':         { fr: 'Proposition d\'ajustement', en: 'Adjustment proposal',        nl: 'Aanpassingsvoorstel' },
  'ai.chat.tool.recovery':       { fr: 'Calcul récupération',      en: 'Recovery computation',        nl: 'Herstelberekening' },
  'ai.chat.tool.session':        { fr: 'Suggestion de séance',     en: 'Session suggestion',          nl: 'Sessievoorstel' },
  'ai.chat.tool.history':        { fr: 'Recherche historique',     en: 'History search',              nl: 'Geschiedenis zoeken' },
  'ai.chat.error':               { fr: 'Erreur. Réessaie.',    en: 'Error. Try again.',          nl: 'Fout. Probeer opnieuw.' },

  // ---- Readiness ----
  'ai.readiness.green':          { fr: 'Prêt à charger',       en: 'Ready to load',           nl: 'Klaar voor belasting' },
  'ai.readiness.amber':          { fr: 'Charge modérée',       en: 'Moderate load',           nl: 'Matige belasting' },
  'ai.readiness.red':            { fr: 'Récupération prioritaire', en: 'Recovery priority',   nl: 'Herstel prioriteit' },
  'ai.readiness.score':          { fr: 'Score',                en: 'Score',                   nl: 'Score' },

  // ---- Adjustments ----
  'ai.adjust.kind.deload':       { fr: 'Déload',               en: 'Deload',                  nl: 'Deload' },
  'ai.adjust.kind.intensify':    { fr: 'Intensifier',          en: 'Intensify',               nl: 'Intensiveren' },
  'ai.adjust.kind.swap':         { fr: 'Échanger un exercice', en: 'Swap exercise',           nl: 'Oefening wisselen' },
  'ai.adjust.kind.addvol':       { fr: 'Ajouter du volume',    en: 'Add volume',              nl: 'Volume toevoegen' },
  'ai.adjust.kind.reducevol':    { fr: 'Réduire le volume',    en: 'Reduce volume',           nl: 'Volume verlagen' },
  'ai.adjust.kind.split':        { fr: 'Changer le split',     en: 'Change split',            nl: 'Split wijzigen' },
  'ai.adjust.kind.recovery':     { fr: 'Ajouter récupération', en: 'Add recovery',            nl: 'Herstel toevoegen' },
  'ai.adjust.status.proposed':   { fr: 'Proposé',              en: 'Proposed',                nl: 'Voorgesteld' },
  'ai.adjust.status.accepted':   { fr: 'Accepté',              en: 'Accepted',                nl: 'Geaccepteerd' },
  'ai.adjust.status.rejected':   { fr: 'Refusé',               en: 'Rejected',                nl: 'Afgewezen' },
  'ai.adjust.status.applied':    { fr: 'Appliqué',             en: 'Applied',                 nl: 'Toegepast' },
  'ai.adjust.status.expired':    { fr: 'Expiré',               en: 'Expired',                 nl: 'Verlopen' },
  'ai.adjust.accept':            { fr: 'Accepter',             en: 'Accept',                  nl: 'Accepteren' },
  'ai.adjust.reject':            { fr: 'Refuser',              en: 'Reject',                  nl: 'Afwijzen' },
  'ai.adjust.apply':             { fr: 'Appliquer maintenant', en: 'Apply now',               nl: 'Nu toepassen' },
  'ai.adjust.evidence':          { fr: 'Données qui justifient', en: 'Justifying data',       nl: 'Onderbouwende data' },
  'ai.adjust.changes':           { fr: 'Modifications proposées', en: 'Proposed changes',     nl: 'Voorgestelde wijzigingen' },
  'ai.adjust.refs':              { fr: 'Références',           en: 'References',              nl: 'Referenties' },

  // ---- Plateau ----
  'ai.plateau.metric.strength':  { fr: 'Force',                en: 'Strength',                nl: 'Kracht' },
  'ai.plateau.metric.volume':    { fr: 'Volume',               en: 'Volume',                  nl: 'Volume' },
  'ai.plateau.metric.bw':        { fr: 'Poids corporel',       en: 'Body weight',             nl: 'Lichaamsgewicht' },
  'ai.plateau.metric.pr':        { fr: 'Records personnels',   en: 'Personal records',        nl: 'Persoonlijke records' },
  'ai.plateau.metric.rpe':       { fr: 'Dérive RPE',           en: 'RPE drift',               nl: 'RPE-drift' },
  'ai.plateau.confidence':       { fr: 'Confiance',            en: 'Confidence',              nl: 'Vertrouwen' },
  'ai.plateau.window':           { fr: 'Fenêtre',              en: 'Window',                  nl: 'Venster' },
  'ai.plateau.delta':            { fr: 'Variation',            en: 'Delta',                   nl: 'Verschil' },
  'ai.plateau.resolve':          { fr: 'Marquer comme résolu', en: 'Mark resolved',           nl: 'Als opgelost markeren' },
  'ai.plateau.recommend':        { fr: 'Action recommandée',   en: 'Recommended action',      nl: 'Aanbevolen actie' },
  'ai.plateau.none':             { fr: 'Aucun plateau détecté.', en: 'No plateau detected.',  nl: 'Geen plateau gedetecteerd.' },

  // ---- Recovery ----
  'ai.recovery.title':           { fr: 'Récupération du jour', en: 'Today\'s recovery',          nl: 'Herstel van vandaag' },
  'ai.recovery.protocol':        { fr: 'Protocole',            en: 'Protocol',                nl: 'Protocol' },
  'ai.recovery.sleep_target':    { fr: 'Sommeil cible',        en: 'Sleep target',            nl: 'Slaapdoel' },
  'ai.recovery.mobility':        { fr: 'Mobilité',             en: 'Mobility',                nl: 'Mobiliteit' },
  'ai.recovery.cardio':          { fr: 'Cardio',               en: 'Cardio',                  nl: 'Cardio' },
  'ai.recovery.ice_bath':        { fr: 'Bain froid',           en: 'Ice bath',                nl: 'IJsbad' },
  'ai.recovery.contrast':        { fr: 'Douche contrastée',    en: 'Contrast shower',         nl: 'Contrastdouche' },
  'ai.recovery.rest_day':        { fr: 'Jour de repos',        en: 'Rest day',                nl: 'Rustdag' },
  'ai.recovery.carbs_extra':     { fr: 'Glucides extra',       en: 'Extra carbs',             nl: 'Extra koolhydraten' },

  // ---- Session suggestion ----
  'ai.session.title':            { fr: 'Séance suggérée',      en: 'Suggested session',       nl: 'Voorgestelde sessie' },
  'ai.session.duration':         { fr: 'Durée',                en: 'Duration',                nl: 'Duur' },
  'ai.session.rpe_target':       { fr: 'RPE cible',            en: 'Target RPE',              nl: 'Doel RPE' },
  'ai.session.rationale':        { fr: 'Pourquoi cette séance', en: 'Why this session',       nl: 'Waarom deze sessie' },
  'ai.session.accept':           { fr: 'Accepter et démarrer', en: 'Accept and start',        nl: 'Accepteren en starten' },
  'ai.session.kind.strength':    { fr: 'Force',                en: 'Strength',                nl: 'Kracht' },
  'ai.session.kind.conditioning':{ fr: 'Conditionnement',      en: 'Conditioning',            nl: 'Conditie' },
  'ai.session.kind.mobility':    { fr: 'Mobilité',             en: 'Mobility',                nl: 'Mobiliteit' },
  'ai.session.kind.rest':        { fr: 'Repos actif',          en: 'Active rest',             nl: 'Actieve rust' },
  'ai.session.kind.tactical':    { fr: 'Tactique',             en: 'Tactical',                nl: 'Tactisch' },

  // ---- Disclaimers (mandatory) ----
  'ai.disclaimer.short':         {
    fr: 'L\'IA t\'assiste, ton coach valide.',
    en: 'AI assists, your coach validates.',
    nl: 'AI ondersteunt, je coach valideert.',
  },
  'ai.disclaimer.medical':       {
    fr: 'Ces conseils ne remplacent pas un avis médical. En cas de douleur, consulte un professionnel de santé.',
    en: 'This advice does not replace medical advice. In case of pain, consult a healthcare professional.',
    nl: 'Dit advies vervangt geen medisch advies. Raadpleeg bij pijn een zorgverlener.',
  },

  // ---- Admin ----
  'ai.admin.usage':              { fr: 'Consommation IA',      en: 'AI usage',                nl: 'AI-gebruik' },
  'ai.admin.tokens_in':          { fr: 'Tokens entrée',        en: 'Input tokens',            nl: 'Invoer tokens' },
  'ai.admin.tokens_out':         { fr: 'Tokens sortie',        en: 'Output tokens',           nl: 'Uitvoer tokens' },
  'ai.admin.cost':               { fr: 'Coût (€)',             en: 'Cost (€)',                nl: 'Kosten (€)' },
  'ai.admin.requests':           { fr: 'Requêtes',             en: 'Requests',                nl: 'Verzoeken' },
} as const;

export type AIKey = keyof typeof aiI18n;

export function t(key: AIKey, lang: Lang = 'fr'): string {
  return aiI18n[key]?.[lang] ?? aiI18n[key]?.fr ?? key;
}
