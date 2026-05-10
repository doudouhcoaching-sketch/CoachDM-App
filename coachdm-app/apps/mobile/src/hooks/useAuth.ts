// ═══════════════════════════════════════════════════════════════
// COACH DM — Hook useAuth
// 
// À utiliser une seule fois dans le root layout pour hydrater
// le store. Les autres composants lisent via les selectors.
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';
import type { Profile } from '@coachdm/shared';

export function useInitAuth() {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const markInitialized = useAuthStore((s) => s.markInitialized);
  const reset = useAuthStore((s) => s.reset);

  useEffect(() => {
    let mounted = true;

    async function loadProfile(userId: string) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!mounted) return;

      if (error) {
        console.warn('Profile load error:', error.message);
        setProfile(null);
        return;
      }
      setProfile(data as Profile);
    }

    // 1. Session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        loadProfile(session.user.id).finally(() => {
          if (mounted) markInitialized();
        });
      } else {
        markInitialized();
      }
    });

    // 2. Listener changements auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        reset();
        return;
      }

      setSession(session);
      if (session?.user) {
        await loadProfile(session.user.id);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setSession, setProfile, markInitialized, reset]);
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function refreshProfile() {
  const session = useAuthStore.getState().session;
  if (!session?.user) return;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (!error && data) {
    useAuthStore.getState().setProfile(data as Profile);
  }
}
