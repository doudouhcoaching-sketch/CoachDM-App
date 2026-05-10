// ═══════════════════════════════════════════════════════════════════════════
// COACH DM · Phase 4 · Web · /admin/recovery/[clientId]
// ═══════════════════════════════════════════════════════════════════════════
// Vue coach des données Recovery d'un client : Recovery Score, sommeil 30j,
// hydratation 14j, habits 7j, streaks. Lecture seule (RLS coach_clients).
// ═══════════════════════════════════════════════════════════════════════════

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase-browser';
import {
  formatDuration, hydrationStatus, computeRecoveryScore, avgSleepMinutes,
} from '@coachdm/shared/recovery';
import type {
  SleepSession, HydrationDaily, HydrationTarget, Habit, HabitLog, RecoveryStreaks,
} from '@coachdm/shared/recovery';

export default function ClientRecoveryPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const supabase = createBrowserClient();

  const [clientName, setClientName] = useState<string>('');
  const [streaks, setStreaks] = useState<RecoveryStreaks | null>(null);
  const [sleep30d, setSleep30d] = useState<SleepSession[]>([]);
  const [hyd14d, setHyd14d] = useState<HydrationDaily[]>([]);
  const [target, setTarget] = useState<HydrationTarget | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs7d, setLogs7d] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const cutoff30 = new Date(); cutoff30.setDate(cutoff30.getDate() - 30);
      const cutoff14 = new Date(); cutoff14.setDate(cutoff14.getDate() - 14);
      const cutoff7  = new Date(); cutoff7.setDate(cutoff7.getDate() - 7);

      const [profile, s, sleep, hyd, tgt, hab, lgs] = await Promise.all([
        supabase.from('profiles').select('full_name, email').eq('id', clientId).single(),
        supabase.from('recovery_streaks').select('*').eq('user_id', clientId).single(),
        supabase.from('sleep_sessions').select('*').eq('user_id', clientId)
          .gte('sleep_date', cutoff30.toISOString().slice(0, 10))
          .order('sleep_date', { ascending: false }),
        supabase.from('hydration_daily').select('*').eq('user_id', clientId)
          .gte('drank_date', cutoff14.toISOString().slice(0, 10))
          .order('drank_date', { ascending: false }),
        supabase.from('hydration_targets').select('*').eq('user_id', clientId).single(),
        supabase.from('habits').select('*').eq('user_id', clientId).eq('archived', false)
          .order('display_order'),
        supabase.from('habit_logs').select('*').eq('user_id', clientId)
          .gte('log_date', cutoff7.toISOString().slice(0, 10)),
      ]);

      setClientName((profile.data?.full_name as string) || (profile.data?.email as string) || '—');
      setStreaks(s.data);
      setSleep30d(sleep.data ?? []);
      setHyd14d(hyd.data ?? []);
      setTarget(tgt.data);
      setHabits(hab.data ?? []);
      setLogs7d(lgs.data ?? []);
      setLoading(false);
    })();
  }, [clientId]);

  const targetMl = target?.target_ml ?? 2500;

  const score = useMemo(() => {
    const avgSleep = avgSleepMinutes(sleep30d, 7);
    const hydLast7 = hyd14d.slice(0, 7);
    const reachedDays = hydLast7.filter((d) => d.total_ml >= targetMl).length;
    return computeRecoveryScore({
      avgSleepMin: avgSleep,
      daysHydrationTargetMet: reachedDays,
      habitsActiveCount: habits.length,
      habitLogsLast7d: logs7d.length,
    });
  }, [sleep30d, hyd14d, targetMl, habits.length, logs7d.length]);

  const displayScore = streaks?.recovery_score ?? score.total;

  if (loading) {
    return <div className="p-8 text-zinc-400">Chargement…</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black text-amber-400 mb-1">Recovery · {clientName}</h1>
        <p className="text-zinc-500 text-sm mb-8">Vue coach — lecture seule</p>

        {/* ─── Score + Streaks ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="md:col-span-2 bg-zinc-900 rounded-2xl p-6 border border-amber-400/20">
            <div className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Recovery Score</div>
            <div className="flex items-end gap-3">
              <div className={`text-6xl font-black ${
                displayScore >= 80 ? 'text-emerald-400' :
                displayScore >= 60 ? 'text-amber-400' :
                displayScore >= 40 ? 'text-sky-400' : 'text-red-400'
              }`}>
                {displayScore}
              </div>
              <div className="text-zinc-500 text-sm pb-2">/100</div>
            </div>
            <div className="mt-4 space-y-1.5">
              <Bar label="Sommeil"      value={score.sleep}     max={40} color="bg-violet-400" />
              <Bar label="Hydratation"  value={score.hydration} max={30} color="bg-sky-400" />
              <Bar label="Habitudes"    value={score.habits}    max={30} color="bg-emerald-400" />
            </div>
          </div>

          <StreakCard label="Sommeil"     current={streaks?.sleep_current ?? 0}     best={streaks?.sleep_best ?? 0}     color="text-violet-400" />
          <StreakCard label="Hydratation" current={streaks?.hydration_current ?? 0} best={streaks?.hydration_best ?? 0} color="text-sky-400" />
        </div>

        {/* ─── Sommeil 30 jours ─────────────────────────────────────────── */}
        <Section title={`Sommeil · ${sleep30d.length} nuits / 30 derniers jours`}>
          {sleep30d.length === 0 ? (
            <div className="text-zinc-500 text-sm">Aucune donnée</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <Stat label="Moyenne 7j"  value={formatDuration(avgSleepMinutes(sleep30d, 7))} />
                <Stat label="Moyenne 30j" value={formatDuration(avgSleepMinutes(sleep30d, 30))} />
                <Stat label="Streak actif" value={`${streaks?.sleep_current ?? 0}j`} />
                <Stat label="Record" value={`${streaks?.sleep_best ?? 0}j`} />
              </div>
              <div className="space-y-1">
                {sleep30d.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 text-sm">
                    <div className="w-24 text-zinc-500 text-xs">{s.sleep_date}</div>
                    <div className="flex-1 bg-zinc-800 rounded h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded ${
                          s.duration_min < 360 ? 'bg-red-500' :
                          s.duration_min < 420 ? 'bg-amber-400' :
                          'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, (s.duration_min / 540) * 100)}%` }}
                      />
                    </div>
                    <div className="w-16 text-right text-xs">{formatDuration(s.duration_min)}</div>
                    <div className="w-12 text-right text-xs text-zinc-500">
                      {s.quality !== null ? `${s.quality}/5` : '—'}
                    </div>
                    <div className="w-12 text-right text-xs text-zinc-500">
                      {s.hrv_rmssd_ms !== null ? `${Math.round(s.hrv_rmssd_ms)}ms` : '—'}
                    </div>
                    <div className="w-8 text-right text-xs">
                      {s.source === 'healthkit' ? '🍎' : s.source === 'google_fit' ? '🤖' : '✏️'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Section>

        {/* ─── Hydratation 14 jours ─────────────────────────────────────── */}
        <Section title={`Hydratation · objectif ${(targetMl / 1000).toFixed(1)} L`}>
          {hyd14d.length === 0 ? (
            <div className="text-zinc-500 text-sm">Aucune donnée</div>
          ) : (
            <div className="space-y-1">
              {hyd14d.map((d) => {
                const status = hydrationStatus(d.total_ml, targetMl);
                return (
                  <div key={d.drank_date} className="flex items-center gap-3 text-sm">
                    <div className="w-24 text-zinc-500 text-xs">{d.drank_date}</div>
                    <div className="flex-1 bg-zinc-800 rounded h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded ${
                          status.status === 'reached' || status.status === 'over' ? 'bg-emerald-400' :
                          status.status === 'on_track' ? 'bg-sky-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${Math.min(100, status.percent)}%` }}
                      />
                    </div>
                    <div className="w-20 text-right text-xs">
                      {(d.total_ml / 1000).toFixed(1)} L
                    </div>
                    <div className="w-12 text-right text-xs text-zinc-500">
                      {status.percent}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ─── Habitudes ────────────────────────────────────────────────── */}
        <Section title={`Habitudes · ${habits.length} actives`}>
          {habits.length === 0 ? (
            <div className="text-zinc-500 text-sm">Aucune habitude active</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {habits.map((h) => {
                const habitLogs = logs7d.filter((l) => l.habit_id === h.id);
                const ratePct = Math.round((habitLogs.length / 7) * 100);
                const label = h.category === 'custom' ? (h.name || '—') : h.category;
                return (
                  <div key={h.id} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold capitalize">{label.replace('_', ' ')}</div>
                      <div className="text-xs text-zinc-500">
                        {habitLogs.length}/7 j
                      </div>
                    </div>
                    <div className="bg-zinc-800 rounded h-1.5 overflow-hidden">
                      <div className="bg-amber-400 h-1.5" style={{ width: `${ratePct}%` }} />
                    </div>
                    {h.target_minutes && (
                      <div className="text-xs text-zinc-500 mt-2">{h.target_minutes} min cible</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-zinc-900/50 rounded-2xl p-6 mb-6 border border-zinc-800">
      <h2 className="text-xl font-bold text-zinc-100 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
      <div className="text-xs text-zinc-500 uppercase tracking-wider">{label}</div>
      <div className="text-xl font-black text-amber-400 mt-1">{value}</div>
    </div>
  );
}

function StreakCard({ label, current, best, color }: {
  label: string; current: number; best: number; color: string;
}) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
      <div className="text-zinc-500 text-xs uppercase tracking-wider">{label}</div>
      <div className={`text-4xl font-black mt-2 ${color}`}>{current}<span className="text-sm text-zinc-500 font-normal"> j</span></div>
      <div className="text-zinc-500 text-xs mt-1">★ Record : {best}</div>
    </div>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-xs text-zinc-400">{label}</div>
      <div className="flex-1 bg-zinc-800 rounded h-1.5 overflow-hidden">
        <div className={`h-1.5 rounded ${color}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <div className="w-12 text-right text-xs text-zinc-500">{value}/{max}</div>
    </div>
  );
}
