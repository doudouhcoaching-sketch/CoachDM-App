// ═══════════════════════════════════════════════════════════════
// COACH DM — Package shared : exports publics
// 
// Importer depuis @coachdm/shared dans web et mobile.
// ═══════════════════════════════════════════════════════════════

// Types
export type * from './types';
export type { Database, Json } from './database.types';

// Calculs
export * from './nutrition';

// OpenFoodFacts
export * from './openfoodfacts';

// Supabase
export * from './supabase';

// i18n
export * from './i18n';

// Validation
export * from './validators';

// Constants utiles
export const APP_CONFIG = {
  name: 'Coach DM',
  domain: 'coachdm.be',
  appDomain: 'app.coachdm.be',
  bce: 'BE0840.260.421',
  email: '[email protected]',
  brandColors: {
    background: '#0A0A0A',
    primary: '#D4AF37',     // Or signature Coach DM
    success: '#10B981',
    danger: '#EF4444',
    info: '#38BDF8',
    accent: '#A78BFA',
    textPrimary: '#FFFFFF',
    textSecondary: '#A1A1AA',
    surface: '#171717',
    border: '#27272A',
  },
  subscription: {
    monthlyPriceCents: 1999,
    currency: 'eur' as const,
    trialDays: 7,
  },
} as const;
