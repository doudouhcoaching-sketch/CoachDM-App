'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { AIPlateauDetection, AIPlateauMetric } from '@coachdm/shared/ai';

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Row = AIPlateauDetection & { client_name?: string | null };

const METRIC_COLOR: Record<AIPlateauMetric, string> = {
  strength: '#EF4444',
  volume: '#F59E0B',
  bodyweight: '#38BDF8',
  pr_count: '#A78BFA',
  rpe_drift: '#10B981',
};

const METRIC_LABEL_FR: Record<AIPlateauMetric, string> = {
  strength: 'Force',
  volume: 'Volume',
  bodyweight: 'Poids corps',
  pr_count: 'PR',
  rpe_drift: 'Dérive RPE',
};

export default function AdminAIPlateausPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filterMetric, setFilterMetric] = useState<AIPlateauMetric | 'all'>('all');
  const [filterResolved, setFilterResolved] = useState<'open' | 'resolved' | 'all'>('open');

  const load = useCallback(async () => {
    setLoading(true);
    let query = sb
      .from('ai_plateau_detections')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(200);

    if (filterMetric !== 'all') query = query.eq('metric', filterMetric);
    if (filterResolved === 'open') query = query.is('resolved_at', null);
    else if (filterResolved === 'resolved') query = query.not('resolved_at', 'is', null);

    const { data: rows } = await query;
    if (!rows) {
      setItems([]);
      setLoading(false);
      return;
    }

    const clientIds = Array.from(new Set(rows.map((r: any) => r.client_id))).filter(Boolean);
    let names: Record<string, string> = {};
    if (clientIds.length > 0) {
      const { data: profiles } = await sb
        .from('user_profiles')
        .select('user_id, display_name, full_name')
        .in('user_id', clientIds);
      if (profiles) {
        names = Object.fromEntries(
          profiles.map((p: any) => [p.user_id, p.display_name ?? p.full_name ?? p.user_id.slice(0, 8)]),
        );
      }
    }
    setItems((rows as any[]).map((r) => ({ ...r, client_name: names[r.client_id] ?? r.client_id.slice(0, 8) })));
    setLoading(false);
  }, [filterMetric, filterResolved]);

  useEffect(() => {
    load();
  }, [load]);

  const scanAll = async () => {
    setScanning(true);
    try {
      const { data: sess } = await sb.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return;
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-plateau-scan`;
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ scope: 'coach_all' }),
      });
      await load();
    } finally {
      setScanning(false);
    }
  };

  const resolveOne = async (id: string) => {
    await sb
      .from('ai_plateau_detections')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', id);
    await load();
  };

  // Group by client for radar overview
  const byClient = items.reduce<Record<string, { name: string; count: number; metrics: Set<AIPlateauMetric> }>>(
    (acc, r) => {
      const k = r.client_id;
      if (!acc[k]) acc[k] = { name: r.client_name ?? k.slice(0, 8), count: 0, metrics: new Set() };
      acc[k].count += 1;
      acc[k].metrics.add(r.metric);
      return acc;
    },
    {},
  );
  const topClients = Object.entries(byClient)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">IA · Plateaus</h1>
            <p className="text-sm text-neutral-400 mt-1">Détection automatique des stagnations de performance</p>
          </div>
          <button
            onClick={scanAll}
            disabled={scanning}
            className="px-5 py-2.5 bg-[#D4AF37] text-black font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50"
          >
            {scanning ? 'Scan…' : '🔍 Scanner tous les clients'}
          </button>
        </div>

        {/* Radar top clients */}
        {topClients.length > 0 && (
          <div className="bg-[#141414] rounded-xl border border-neutral-800 p-5 mb-6">
            <div className="text-xs font-bold text-[#D4AF37] uppercase tracking-wide mb-3">
              Clients avec le plus de plateaus ouverts
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {topClients.map((c) => (
                <div key={c.id} className="bg-[#0A0A0A] border border-neutral-800 rounded-lg p-3">
                  <div className="text-sm font-bold truncate">{c.name}</div>
                  <div className="text-xs text-[#D4AF37] mt-1">
                    {c.count} plateau{c.count > 1 ? 's' : ''}
                  </div>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {Array.from(c.metrics).map((m) => (
                      <span
                        key={m}
                        className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                        style={{
                          backgroundColor: `${METRIC_COLOR[m]}20`,
                          color: METRIC_COLOR[m],
                        }}
                      >
                        {METRIC_LABEL_FR[m]}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <select
            value={filterMetric}
            onChange={(e) => setFilterMetric(e.target.value as any)}
            className="bg-[#141414] border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-[#D4AF37] outline-none"
          >
            <option value="all">Toutes métriques</option>
            {(Object.keys(METRIC_LABEL_FR) as AIPlateauMetric[]).map((m) => (
              <option key={m} value={m}>
                {METRIC_LABEL_FR[m]}
              </option>
            ))}
          </select>
          <select
            value={filterResolved}
            onChange={(e) => setFilterResolved(e.target.value as any)}
            className="bg-[#141414] border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-[#D4AF37] outline-none"
          >
            <option value="open">Ouverts</option>
            <option value="resolved">Résolus</option>
            <option value="all">Tous</option>
          </select>
        </div>

        {/* Liste */}
        <div className="bg-[#141414] rounded-xl border border-neutral-800 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-neutral-400 text-sm">Chargement…</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-neutral-400 text-sm">Aucun plateau détecté</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#0A0A0A] border-b border-neutral-800">
                <tr className="text-left text-xs uppercase tracking-wider text-neutral-400">
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Métrique</th>
                  <th className="px-4 py-3">Confiance</th>
                  <th className="px-4 py-3">Fenêtre</th>
                  <th className="px-4 py-3">Détecté</th>
                  <th className="px-4 py-3">Insight</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-b border-neutral-800 hover:bg-[#1a1a1a]">
                    <td className="px-4 py-3 font-bold">{r.client_name}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-bold px-2 py-1 rounded"
                        style={{
                          backgroundColor: `${METRIC_COLOR[r.metric]}20`,
                          color: METRIC_COLOR[r.metric],
                        }}
                      >
                        {METRIC_LABEL_FR[r.metric]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#D4AF37] font-bold">
                      {Math.round((r.confidence ?? 0) * 100)}%
                    </td>
                    <td className="px-4 py-3 text-neutral-400">{r.window_days}j</td>
                    <td className="px-4 py-3 text-neutral-400 text-xs">
                      {new Date(r.detected_at).toLocaleDateString('fr-BE')}
                    </td>
                    <td className="px-4 py-3 text-xs max-w-md truncate">{r.insight_fr ?? '—'}</td>
                    <td className="px-4 py-3">
                      {!r.resolved_at && (
                        <button
                          onClick={() => resolveOne(r.id)}
                          className="text-xs px-3 py-1 bg-[#10B981]/20 text-[#10B981] border border-[#10B981] rounded hover:bg-[#10B981]/30 transition"
                        >
                          Résoudre
                        </button>
                      )}
                      {r.resolved_at && <span className="text-xs text-neutral-500">Résolu</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
