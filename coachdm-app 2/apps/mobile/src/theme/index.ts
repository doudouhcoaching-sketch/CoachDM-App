// ═══════════════════════════════════════════════════════════════
// COACH DM — Theme tokens
// 
// Design noir + or, premium, inspiré Future / Centr / Ladder.
// Tous les composants tirent leurs valeurs d'ici.
// ═══════════════════════════════════════════════════════════════

export const colors = {
  // Backgrounds
  bg: '#0A0A0A',              // Noir profond Coach DM
  bgElevated: '#141414',
  surface: '#171717',
  surfaceElevated: '#1F1F1F',
  
  // Or signature
  primary: '#D4AF37',
  primaryDim: '#A8862A',
  primarySubtle: 'rgba(212, 175, 55, 0.15)',
  
  // Macros (cohérent avec PDFs)
  protein: '#EF4444',         // Rouge
  carbs: '#38BDF8',           // Bleu  
  fat: '#A78BFA',             // Violet
  fiber: '#10B981',           // Vert
  water: '#0EA5E9',
  
  // Sémantique
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#38BDF8',
  
  // Texte
  text: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textTertiary: '#71717A',
  textOnPrimary: '#0A0A0A',
  
  // Bordures
  border: '#27272A',
  borderSubtle: '#1F1F1F',
  borderStrong: '#3F3F46',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.7)',
  shimmer: 'rgba(255, 255, 255, 0.05)',
} as const;

export const typography = {
  // Tailles
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  xl2: 24,
  xl3: 32,
  xl4: 44,
  xl5: 56,
  
  // Poids (RN convertit auto)
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '900' as const,
  },
  
  // Line heights ratio
  tight: 1.1,
  normal: 1.4,
  relaxed: 1.6,
} as const;

export const spacing = {
  px: 1,
  '0_5': 2,
  '1': 4,
  '2': 8,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '7': 28,
  '8': 32,
  '10': 40,
  '12': 48,
  '14': 56,
  '16': 64,
  '20': 80,
  '24': 96,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xl2: 28,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  goldGlow: {
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const animation = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
} as const;

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  animation,
};

export type Theme = typeof theme;
