// ═══════════════════════════════════════════════════════════════════════════
// COACH DM · Phase 4 · Web · /admin/recovery
// ═══════════════════════════════════════════════════════════════════════════
// Liste de tous les clients du coach connecté avec aperçu Recovery Score
// ═══════════════════════════════════════════════════════════════════════════

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase-browser';

interface ClientRow {
  client_id: string;
  full_name: string | null;
  email: string;
  recovery_score: number | null;
  sleep_streak: number;
  hydration_streak: number;
  habits_streak: number;
  score_updated_at: string | null;
}

export default function RecoveryListPage() {
  const supabase = createBrowserClient();
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Clients actifs du coach
      const { data: cc } = await supabase
        .from('coach_clients')
        .select('client_id, profiles!coach_clients_client_id_fkey(full_name, email)')
        .eq('coach_id', user.id)
        .eq('status', 'active');

      if (!cc) { setLoading(false); return; }

      const clientIds = cc.map((c: any) => c.client_id);

      // Streaks pour ces clients
      const { data: streaks } = await supabase
        .from('recovery_streaks')
        .select('*')
        .in('user_id', clientIds);

      const streakByClient = new Map<string, any>();
      for (const s of streaks ?? []) streakByClient.set(s.user_id, s);

      const result: ClientRow[] = cc.map((c: any) => {
        const s = streakByClient.get(c.client_id);
        const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
        return {
          client_id: c.client_id,
          full_name: profile?.full_name ?? null,
          email: profile?.email ?? '—',
          recovery_score: s?.recovery_score ?? null,
          sleep_streak: s?.sleep_current ?? 0,
          hydration_streak: s?.hydration_current ?? 0,
          habits_streak: s?.habits_current ?? 0,
          score_updated_at: s?.score_updated_at ?? null,
        };
      });

      // Tri : score décroissant, NULL à la fin
      result.sort((a, b) => {
        if (a.recovery_score === null && b.recovery_score === null) return 0;
        if (a.recovery_score === null) return 1;
        if (b.recovery_score === null) return -1;
        return b.recovery_score - a.recovery_score;
      });

      setRows(result);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-8 text-zinc-400">Chargement…</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black text-amber-400 mb-1">Recovery · Mes clients</h1>
        <p className="text-zinc-500 text-sm mb-8">Aperçu Recovery Score, streaks, dernière mise à jour</p>

        {rows.length === 0 ? (
          <div className="bg-zinc-900 rounded-2xl p-8 text-center text-zinc-500 border border-zinc-800">
            Aucun client actif
          </div>
        ) : (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/50 border-b border-zinc-800">
                <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3 text-right">Sommeil</th>
                  <th className="px-4 py-3 text-right">Hydra</th>
                  <th className="px-4 py-3 text-right">Habits</th>
                  <th className="px-4 py-3 text-right">MàJ</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.client_id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{r.full_name || '—'}</div>
                      <div className="text-xs text-zinc-500">{r.email}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.recovery_score !== null ? (
                        <span className={`font-black text-2xl ${
                          r.recovery_score >= 80 ? 'text-emerald-400' :
                          r.recovery_score >= 60 ? 'text-amber-400' :
                          r.recovery_score >= 40 ? 'text-sky-400' : 'text-red-400'
                        }`}>
                          {r.recovery_score}
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-violet-400 font-bold">{r.sleep_streak}j</td>
                    <td className="px-4 py-3 text-right text-sky-400 font-bold">{r.hydration_streak}j</td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-bold">{r.habits_streak}j</td>
                    <td className="px-4 py-3 text-right text-xs text-zinc-500">
                      {r.score_updated_at
                        ? new Date(r.score_updated_at).toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/recovery/${r.client_id}`}
                        className="text-amber-400 hover:text-amber-300 text-sm font-semibold"
                      >
                        Détail →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
