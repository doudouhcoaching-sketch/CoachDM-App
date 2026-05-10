// ═══════════════════════════════════════════════════════════════
// COACH DM — Supabase client (mobile)
// 
// Stockage : Expo SecureStore (Keychain iOS / Keystore Android).
// Bien plus sécurisé qu'AsyncStorage pour les tokens d'auth.
// ═══════════════════════════════════════════════════════════════

import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTypedSupabaseClient } from '@coachdm/shared';

// SecureStore a une limite de 2KB. Les tokens Supabase (JWT) peuvent
// dépasser cette limite. On chunk si nécessaire.
const CHUNK_PREFIX = 'sb-chunk-';
const CHUNK_SIZE = 1800;

const SecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value && value.startsWith(CHUNK_PREFIX)) {
        const count = parseInt(value.slice(CHUNK_PREFIX.length), 10);
        const chunks: string[] = [];
        for (let i = 0; i < count; i++) {
          const chunk = await SecureStore.getItemAsync(`${key}_${i}`);
          if (chunk == null) return null;
          chunks.push(chunk);
        }
        return chunks.join('');
      }
      return value;
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      return AsyncStorage.setItem(key, value);
    }
    try {
      if (value.length <= CHUNK_SIZE) {
        await SecureStore.setItemAsync(key, value);
        return;
      }
      // Chunking
      const chunks = Math.ceil(value.length / CHUNK_SIZE);
      for (let i = 0; i < chunks; i++) {
        await SecureStore.setItemAsync(
          `${key}_${i}`,
          value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
        );
      }
      await SecureStore.setItemAsync(key, `${CHUNK_PREFIX}${chunks}`);
    } catch (err) {
      console.warn('SecureStore.setItem failed', err);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      return AsyncStorage.removeItem(key);
    }
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value && value.startsWith(CHUNK_PREFIX)) {
        const count = parseInt(value.slice(CHUNK_PREFIX.length), 10);
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(`${key}_${i}`);
        }
      }
      await SecureStore.deleteItemAsync(key);
    } catch (err) {
      console.warn('SecureStore.removeItem failed', err);
    }
  },
};

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Check .env.local',
  );
}

export const supabase = createTypedSupabaseClient({
  url,
  anonKey,
  storage: SecureStoreAdapter,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,    // false en mobile (pas d'URL callback)
  flowType: 'pkce',
});
