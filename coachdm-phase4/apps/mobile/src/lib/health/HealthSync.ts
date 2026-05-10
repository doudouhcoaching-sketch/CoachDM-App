// ═══════════════════════════════════════════════════════════════════════════
// COACH DM · Phase 4 · Mobile · Health sync service
// ═══════════════════════════════════════════════════════════════════════════
// Synchronise HealthKit/Health Connect → Supabase
// Idempotent grâce aux contraintes UNIQUE (user_id, source, external_id)
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import { HealthBridge } from './HealthBridge';

const LAST_SYNC_KEY = 'coachdm:health:last_sync';

export interface HealthSyncResult {
  sleep: number;
  hydration: number;
  hrv: number;
  errors: string[];
}

export const HealthSync = {
  async getLastSync(): Promise<Date | null> {
    const v = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return v ? new Date(v) : null;
  },

  async setLastSync(d: Date): Promise<void> {
    await AsyncStorage.setItem(LAST_SYNC_KEY, d.toISOString());
  },

  /**
   * Sync complet : sommeil + hydratation + HRV
   * Retourne les compteurs d'éléments importés
   */
  async syncAll(daysBack = 14): Promise<HealthSyncResult> {
    const result: HealthSyncResult = { sleep: 0, hydration: 0, hrv: 0, errors: [] };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      result.errors.push('Not authenticated');
      return result;
    }

    const ok = await HealthBridge.init();
    if (!ok) {
      result.errors.push('Health permissions not granted');
      return result;
    }

    const source = HealthBridge.sourceLabel;
    if (!source) {
      result.errors.push('Platform not supported');
      return result;
    }

    // ─── Sleep ────────────────────────────────────────────────────────────
    try {
      const sleepImports = await HealthBridge.fetchSleep(daysBack);

      // Index HRV par date pour les matcher
      const hrvSamples = await HealthBridge.fetchHrv(daysBack);
      const hrvByDate = new Map<string, number[]>();
      for (const h of hrvSamples) {
        const d = new Date(h.measured_at).toISOString().slice(0, 10);
        if (!hrvByDate.has(d)) hrvByDate.set(d, []);
        hrvByDate.get(d)!.push(h.rmssd_ms);
      }

      const rows = sleepImports.map((s) => {
        const sleepDate = new Date(s.wake_time).toISOString().slice(0, 10);
        const hrvList = hrvByDate.get(sleepDate);
        const hrv_rmssd_ms = hrvList && hrvList.length
          ? hrvList.reduce((a, b) => a + b, 0) / hrvList.length
          : null;

        return {
          user_id: user.id,
          sleep_date: sleepDate,
          bedtime: s.bedtime,
          wake_time: s.wake_time,
          deep_min: s.deep_min ?? null,
          rem_min: s.rem_min ?? null,
          light_min: s.light_min ?? null,
          awake_min: s.awake_min ?? null,
          hrv_rmssd_ms,
          source,
          external_id: s.external_id,
        };
      });

      if (rows.length > 0) {
        // Upsert sur (user_id, source, external_id) puis sur (user_id, sleep_date)
        // Stratégie : on tente l'insert, on ignore les doublons
        const { error, count } = await supabase
          .from('sleep_sessions')
          .upsert(rows, {
            onConflict: 'user_id,source,external_id',
            ignoreDuplicates: true,
            count: 'exact',
          });

        if (error) {
          // Fallback : insert un par un (parfois conflit sur sleep_date)
          for (const row of rows) {
            const { error: e2 } = await supabase
              .from('sleep_sessions')
              .upsert([row], {
                onConflict: 'user_id,source,external_id',
                ignoreDuplicates: true,
              });
            if (!e2) result.sleep++;
          }
        } else {
          result.sleep = count ?? rows.length;
        }

        result.hrv = hrvSamples.length;
      }
    } catch (e: any) {
      result.errors.push(`Sleep sync: ${e.message || e}`);
    }

    // ─── Hydration ────────────────────────────────────────────────────────
    try {
      const waterImports = await HealthBridge.fetchWater(daysBack);
      const rows = waterImports.map((w) => ({
        user_id: user.id,
        amount_ml: w.amount_ml,
        drank_at: w.drank_at,
        drank_date: new Date(w.drank_at).toISOString().slice(0, 10),
        source,
        external_id: w.external_id,
      }));

      if (rows.length > 0) {
        const { error, count } = await supabase
          .from('hydration_entries')
          .upsert(rows, {
            onConflict: 'user_id,source,external_id',
            ignoreDuplicates: true,
            count: 'exact',
          });

        if (!error) result.hydration = count ?? rows.length;
        else result.errors.push(`Hydration: ${error.message}`);
      }
    } catch (e: any) {
      result.errors.push(`Hydration sync: ${e.message || e}`);
    }

    await this.setLastSync(new Date());
    return result;
  },
};
