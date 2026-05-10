// ═══════════════════════════════════════════════════════════════
// COACH DM — Supabase client factory
// 
// Le client web et le client mobile utilisent le même schéma de
// Database mais des storages différents (cookies vs SecureStore).
// Chaque app fournit son propre createClient.
// ═══════════════════════════════════════════════════════════════

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type AppSupabaseClient = SupabaseClient<Database>;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  storage?: {
    getItem: (key: string) => Promise<string | null> | string | null;
    setItem: (key: string, value: string) => Promise<void> | void;
    removeItem: (key: string) => Promise<void> | void;
  };
  detectSessionInUrl?: boolean;
  flowType?: 'pkce' | 'implicit';
  persistSession?: boolean;
  autoRefreshToken?: boolean;
}

export function createTypedSupabaseClient(config: SupabaseConfig): AppSupabaseClient {
  return createSupabaseClient<Database>(config.url, config.anonKey, {
    auth: {
      storage: config.storage as unknown as undefined,
      autoRefreshToken: config.autoRefreshToken ?? true,
      persistSession: config.persistSession ?? true,
      detectSessionInUrl: config.detectSessionInUrl ?? true,
      flowType: config.flowType ?? 'pkce',
    },
  });
}
