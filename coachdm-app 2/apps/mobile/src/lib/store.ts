// ═══════════════════════════════════════════════════════════════
// COACH DM — Store Zustand (session + locale)
// 
// Hydraté au démarrage par le AuthProvider, puis source unique
// pour tous les composants.
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import type { LocaleCode, Profile } from '@coachdm/shared';

interface AuthState {
  // État
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  locale: LocaleCode;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLocale: (locale: LocaleCode) => void;
  setLoading: (loading: boolean) => void;
  markInitialized: () => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  locale: 'fr',
  isLoading: true,
  isInitialized: false,

  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) =>
    set({
      profile,
      locale: profile?.locale ?? 'fr',
    }),
  setLocale: (locale) => set({ locale }),
  setLoading: (isLoading) => set({ isLoading }),
  markInitialized: () => set({ isInitialized: true, isLoading: false }),

  reset: () =>
    set({
      session: null,
      user: null,
      profile: null,
      isLoading: false,
    }),
}));

// Sélecteurs typés (évitent les re-renders inutiles)
export const useSession = () => useAuthStore((s) => s.session);
export const useUser = () => useAuthStore((s) => s.user);
export const useProfile = () => useAuthStore((s) => s.profile);
export const useLocale = () => useAuthStore((s) => s.locale);
export const useIsAuthenticated = () => useAuthStore((s) => s.session != null);
export const useIsOnboarded = () =>
  useAuthStore((s) => s.profile?.onboarding_completed === true);
