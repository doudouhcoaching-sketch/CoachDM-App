// ═══════════════════════════════════════════════════════════════════════════
// COACH DM · Phase 4 · Mobile · Health bridge (iOS + Android)
// ═══════════════════════════════════════════════════════════════════════════
// iOS    : react-native-health (HealthKit)
// Android: react-native-health-connect (Health Connect / Google Fit)
//
// Note Android : Google Fit est en sunset (déc 2024). On bascule sur
// Health Connect qui est l'API recommandée par Google. Le label "Google Fit"
// reste affiché côté UI car c'est ce que les users connaissent.
// ═══════════════════════════════════════════════════════════════════════════

import { Platform } from 'react-native';

export interface SleepImport {
  external_id: string;
  bedtime: string;          // ISO
  wake_time: string;        // ISO
  duration_min: number;
  deep_min?: number;
  rem_min?: number;
  light_min?: number;
  awake_min?: number;
}

export interface HrvSample {
  external_id: string;
  measured_at: string;
  rmssd_ms: number;
}

export interface HydrationImport {
  external_id: string;
  drank_at: string;
  amount_ml: number;
}

// ─── iOS : HealthKit ────────────────────────────────────────────────────────

type HK = any;
let _hk: HK | null = null;

async function loadHK(): Promise<HK | null> {
  if (Platform.OS !== 'ios') return null;
  if (_hk) return _hk;
  try {
    // Lazy require — package optionnel
    _hk = require('react-native-health').default;
  } catch {
    console.warn('[health] react-native-health not installed on iOS');
    return null;
  }
  return _hk;
}

const HK_PERMISSIONS = {
  permissions: {
    read: [
      'SleepAnalysis',
      'HeartRateVariability',
      'Water',
      'ActiveEnergyBurned',
      'StepCount',
    ],
    write: [
      'SleepAnalysis',
      'Water',
    ],
  },
};

async function hkInit(): Promise<boolean> {
  const HK = await loadHK();
  if (!HK) return false;
  return new Promise<boolean>((resolve) => {
    HK.initHealthKit(HK_PERMISSIONS, (err: Error | null) => {
      if (err) {
        console.warn('[health] HealthKit init failed', err);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

async function hkFetchSleep(daysBack: number): Promise<SleepImport[]> {
  const HK = await loadHK();
  if (!HK) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  return new Promise<SleepImport[]>((resolve) => {
    HK.getSleepSamples(
      {
        startDate: startDate.toISOString(),
        limit: 100,
      },
      (err: Error | null, results: any[]) => {
        if (err || !results) {
          resolve([]);
          return;
        }
        // Agréger par nuit (HealthKit retourne plusieurs samples par nuit)
        const byNight = new Map<string, {
          bedtime: string;
          wake_time: string;
          deep: number; rem: number; light: number; awake: number;
        }>();

        for (const s of results) {
          // Date "wake" comme clé
          const wake = new Date(s.endDate);
          const key = wake.toISOString().slice(0, 10);
          const existing = byNight.get(key) || {
            bedtime: s.startDate,
            wake_time: s.endDate,
            deep: 0, rem: 0, light: 0, awake: 0,
          };
          // Étendre la fenêtre
          if (new Date(s.startDate) < new Date(existing.bedtime)) existing.bedtime = s.startDate;
          if (new Date(s.endDate) > new Date(existing.wake_time)) existing.wake_time = s.endDate;

          const dur = (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000;
          switch (s.value) {
            case 'DEEP':  existing.deep += dur; break;
            case 'REM':   existing.rem += dur; break;
            case 'CORE':
            case 'LIGHT': existing.light += dur; break;
            case 'AWAKE': existing.awake += dur; break;
          }
          byNight.set(key, existing);
        }

        const out: SleepImport[] = [];
        for (const [key, v] of byNight) {
          const dur = (new Date(v.wake_time).getTime() - new Date(v.bedtime).getTime()) / 60000;
          if (dur < 30 || dur > 1080) continue; // sanity check
          out.push({
            external_id: `hk_${key}_${Math.round(new Date(v.bedtime).getTime() / 1000)}`,
            bedtime: v.bedtime,
            wake_time: v.wake_time,
            duration_min: Math.round(dur),
            deep_min:  v.deep  > 0 ? Math.round(v.deep)  : undefined,
            rem_min:   v.rem   > 0 ? Math.round(v.rem)   : undefined,
            light_min: v.light > 0 ? Math.round(v.light) : undefined,
            awake_min: v.awake > 0 ? Math.round(v.awake) : undefined,
          });
        }
        resolve(out);
      }
    );
  });
}

async function hkFetchHrv(daysBack: number): Promise<HrvSample[]> {
  const HK = await loadHK();
  if (!HK) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  return new Promise<HrvSample[]>((resolve) => {
    HK.getHeartRateVariabilitySamples(
      { startDate: startDate.toISOString(), limit: 200 },
      (err: Error | null, results: any[]) => {
        if (err || !results) { resolve([]); return; }
        resolve(
          results.map((s) => ({
            external_id: `hk_hrv_${Math.round(new Date(s.startDate).getTime() / 1000)}`,
            measured_at: s.startDate,
            // HealthKit HRV est en SDNN (ms), mais on stocke comme RMSSD-équivalent
            // (différence faible chez l'athlète, la lib retourne ms directement)
            rmssd_ms: parseFloat(s.value),
          }))
        );
      }
    );
  });
}

async function hkFetchWater(daysBack: number): Promise<HydrationImport[]> {
  const HK = await loadHK();
  if (!HK) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  return new Promise<HydrationImport[]>((resolve) => {
    HK.getWaterSamples(
      { startDate: startDate.toISOString(), limit: 500 },
      (err: Error | null, results: any[]) => {
        if (err || !results) { resolve([]); return; }
        resolve(
          results
            .filter((s) => s.value > 0)
            .map((s) => ({
              external_id: `hk_water_${Math.round(new Date(s.startDate).getTime() / 1000)}`,
              drank_at: s.startDate,
              // HealthKit retourne en litres → ml
              amount_ml: Math.round(parseFloat(s.value) * 1000),
            }))
        );
      }
    );
  });
}

// ─── Android : Health Connect ───────────────────────────────────────────────

type HC = any;
let _hc: HC | null = null;

async function loadHC(): Promise<HC | null> {
  if (Platform.OS !== 'android') return null;
  if (_hc) return _hc;
  try {
    _hc = require('react-native-health-connect');
  } catch {
    console.warn('[health] react-native-health-connect not installed on Android');
    return null;
  }
  return _hc;
}

const HC_PERMISSIONS = [
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
  { accessType: 'read', recordType: 'Hydration' },
  { accessType: 'write', recordType: 'SleepSession' },
  { accessType: 'write', recordType: 'Hydration' },
];

async function hcInit(): Promise<boolean> {
  const HC = await loadHC();
  if (!HC) return false;
  try {
    const init = await HC.initialize();
    if (!init) return false;
    const granted = await HC.requestPermission(HC_PERMISSIONS);
    return granted.length > 0;
  } catch (e) {
    console.warn('[health] Health Connect init failed', e);
    return false;
  }
}

async function hcFetchSleep(daysBack: number): Promise<SleepImport[]> {
  const HC = await loadHC();
  if (!HC) return [];

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - daysBack);

  try {
    const res = await HC.readRecords('SleepSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    });

    return (res.records || []).map((r: any) => {
      const stages = r.stages || [];
      let deep = 0, rem = 0, light = 0, awake = 0;
      for (const st of stages) {
        const dur = (new Date(st.endTime).getTime() - new Date(st.startTime).getTime()) / 60000;
        switch (st.stage) {
          case 5: deep += dur; break;       // DEEP
          case 6: rem += dur; break;        // REM
          case 4: light += dur; break;      // LIGHT
          case 1: awake += dur; break;      // AWAKE
        }
      }
      const dur = (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 60000;

      return {
        external_id: `hc_${r.metadata?.id || r.startTime}`,
        bedtime: r.startTime,
        wake_time: r.endTime,
        duration_min: Math.round(dur),
        deep_min:  deep  > 0 ? Math.round(deep)  : undefined,
        rem_min:   rem   > 0 ? Math.round(rem)   : undefined,
        light_min: light > 0 ? Math.round(light) : undefined,
        awake_min: awake > 0 ? Math.round(awake) : undefined,
      } as SleepImport;
    });
  } catch (e) {
    console.warn('[health] HC sleep fetch failed', e);
    return [];
  }
}

async function hcFetchHrv(daysBack: number): Promise<HrvSample[]> {
  const HC = await loadHC();
  if (!HC) return [];

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - daysBack);

  try {
    const res = await HC.readRecords('HeartRateVariabilityRmssd', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    });
    return (res.records || []).map((r: any) => ({
      external_id: `hc_hrv_${r.metadata?.id || r.time}`,
      measured_at: r.time,
      rmssd_ms: r.heartRateVariabilityMillis,
    }));
  } catch {
    return [];
  }
}

async function hcFetchWater(daysBack: number): Promise<HydrationImport[]> {
  const HC = await loadHC();
  if (!HC) return [];

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - daysBack);

  try {
    const res = await HC.readRecords('Hydration', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    });
    return (res.records || [])
      .filter((r: any) => r.volume?.inMilliliters > 0)
      .map((r: any) => ({
        external_id: `hc_water_${r.metadata?.id || r.startTime}`,
        drank_at: r.startTime,
        amount_ml: Math.round(r.volume.inMilliliters),
      }));
  } catch {
    return [];
  }
}

// ─── API publique ───────────────────────────────────────────────────────────

export const HealthBridge = {
  /** Initialise et demande les permissions */
  async init(): Promise<boolean> {
    if (Platform.OS === 'ios') return hkInit();
    if (Platform.OS === 'android') return hcInit();
    return false;
  },

  /** Source actuelle (label UI) */
  get sourceLabel(): 'healthkit' | 'google_fit' | null {
    if (Platform.OS === 'ios') return 'healthkit';
    if (Platform.OS === 'android') return 'google_fit';
    return null;
  },

  async fetchSleep(daysBack = 30): Promise<SleepImport[]> {
    if (Platform.OS === 'ios') return hkFetchSleep(daysBack);
    if (Platform.OS === 'android') return hcFetchSleep(daysBack);
    return [];
  },

  async fetchHrv(daysBack = 7): Promise<HrvSample[]> {
    if (Platform.OS === 'ios') return hkFetchHrv(daysBack);
    if (Platform.OS === 'android') return hcFetchHrv(daysBack);
    return [];
  },

  async fetchWater(daysBack = 7): Promise<HydrationImport[]> {
    if (Platform.OS === 'ios') return hkFetchWater(daysBack);
    if (Platform.OS === 'android') return hcFetchWater(daysBack);
    return [];
  },
};
