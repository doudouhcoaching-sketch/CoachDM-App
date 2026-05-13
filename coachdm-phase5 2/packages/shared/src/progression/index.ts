// =====================================================================
// Coach DM · Phase 5 · Public API
// =====================================================================

export * from './types';
export * from './calc1RM';
export * from './plateau';
export * from './formatters';
export * from './i18n';

// Couleurs Coach DM (réutilisées partout)
export const COACH_DM_COLORS = {
  bg: '#0A0A0A',
  gold: '#D4AF37',
  green: '#10B981',
  red: '#EF4444',
  blue: '#38BDF8',
  violet: '#A78BFA',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  border: '#27272A',
  cardBg: '#171717',
} as const;

// Échelle d'intensité du calendrier (5 niveaux)
export const CALENDAR_INTENSITY_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: '#1F1F1F',
  1: '#3B2F0E',
  2: '#7A5F1C',
  3: '#B89030',
  4: '#D4AF37', // gold pleine intensité
};
