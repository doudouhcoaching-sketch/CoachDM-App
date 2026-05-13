'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { AIUsageDaily } from '@coachdm/shared/ai';

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Range = '7d' | '30d' | '90d';

export default function AdminAIUsagePage() {
  const [rows, setRows] = useState<AIUsageDaily[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('30d');

  const days = useMemo(() => (range === '7d' ? 7 : range === '30d' ? 30 : 90), [range]);

  const load = useCallback(async () => {
    setLoading(true);
    const from = new Date();
    from.setDate(from.getDate() - days);
    const fromStr = from.toISOString().slice(0, 10);
    const { data } = await sb
      .from('ai_usage_daily')
      .select('*')
      .gte('date', fromStr)
      .order('date', { ascending: true });
    setRows((data as any) ?? []);
    setLoading(false);
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  // Aggregate
  const byDate = useMemo(() => {
    const m = new Map<string, { tokens_in: number; tokens_out: number; cost_eur: number; requests: number }>();
    for (const r of rows) {
      const k = r.date;
      const cur = m.get(k) ?? { tokens_in: 0, tokens_out: 0, cost_eur: 0, requests: 0 };
      cur.tokens_in += r.tokens_in ?? 0;
      cur.tokens_out += r.tokens_out ?? 0;
      cur.cost_eur += r.cost_eur ?? 0;
      cur.requests += r.requests ?? 0;
      m.set(k, cur);
    }
    return Array.from(m.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [rows]);

  const totals = useMemo(
    () => ({
      tokens_in: byDate.reduce((s, d) => s + d.tokens_in, 0),
      tokens_out: byDate.reduce((s, d) => s + d.tokens_out, 0),
      cost_eur: byDate.reduce((s, d) => s + d.cost_eur, 0),
      requests: byDate.reduce((s, d) => s + d.requests, 0),
    }),
    [byDate],
  );

  const maxCost = Math.max(...byDate.map((d) => d.cost_eur), 0.01);
  const maxReq = Math.max(...byDate.map((d) => d.requests), 1);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">IA · Usage & Coûts</h1>
            <p className="text-sm text-neutral-400 mt-1">Suivi des tokens, requêtes et coûts Anthropic</p>
          </div>
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-2 text-xs font-bold rounded-lg border transition ${
                  range === r
                    ? 'bg-[#D4AF37] border-[#D4AF37] text-black'
                    : 'bg-[#141414] border-neutral-800 text-neutral-400 hover:border-[#D4AF37]'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KPI label="Requêtes" value={totals.requests.toLocaleString('fr-BE')} color="#38BDF8" />
          <KPI
            label="Tokens entrants"
            value={totals.tokens_in.toLocaleString('fr-BE')}
            color="#A78BFA"
          />
          <KPI
            label="Tokens sortants"
            value={totals.tokens_out.toLocaleString('fr-BE')}
            color="#10B981"
          />
          <KPI
            label="Coût total"
            value={`${totals.cost_eur.toFixed(2)} €`}
            color="#D4AF37"
          />
        </div>

        {/* Graph coût */}
        <div className="bg-[#141414] rounded-xl border border-neutral-800 p-5 mb-6">
          <div className="text-xs font-bold text-[#D4AF37] uppercase tracking-wide mb-4">
            Coût quotidien (€)
          </div>
          {loading ? (
            <div className="text-center text-neutral-400 text-sm py-12">Chargement…</div>
          ) : byDate.length === 0 ? (
            <div className="text-center text-neutral-400 text-sm py-12">Aucune donnée</div>
          ) : (
            <div className="flex items-end gap-1 h-48">
              {byDate.map((d) => {
                const pct = (d.cost_eur / maxCost) * 100;
                return (
                  <div
                    key={d.date}
                    className="flex-1 group relative flex flex-col items-center justify-end"
                    style={{ minWidth: 8 }}
                  >
                    <div
                      className="w-full bg-[#D4AF37] hover:bg-[#F5C544] rounded-t transition"
                      style={{ height: `${pct}%`, minHeight: 2 }}
                    />
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black border border-[#D4AF37] rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10 pointer-events-none">
                      <div className="font-bold text-[#D4AF37]">{d.date}</div>
                      <div>{d.cost_eur.toFixed(3)} €</div>
                      <div className="text-neutral-400">{d.requests} req · {d.tokens_in + d.tokens_out} tok</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex justify-between text-xs text-neutral-500 mt-2">
            <span>{byDate[0]?.date ?? ''}</span>
            <span>{byDate[byDate.length - 1]?.date ?? ''}</span>
          </div>
        </div>

        {/* Graph requêtes */}
        <div className="bg-[#141414] rounded-xl border border-neutral-800 p-5 mb-6">
          <div className="text-xs font-bold text-[#D4AF37] uppercase tracking-wide mb-4">
            Requêtes quotidiennes
          </div>
          {byDate.length === 0 ? (
            <div className="text-center text-neutral-400 text-sm py-12">Aucune donnée</div>
          ) : (
            <div className="flex items-end gap-1 h-32">
              {byDate.map((d) => {
                const pct = (d.requests / maxReq) * 100;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-end justify-end" style={{ minWidth: 8 }}>
                    <div
                      className="w-full bg-[#38BDF8] rounded-t"
                      style={{ height: `${pct}%`, minHeight: 2 }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Table par jour */}
        <div className="bg-[#141414] rounded-xl border border-neutral-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-800">
            <div className="text-xs font-bold text-[#D4AF37] uppercase tracking-wide">Détails par jour</div>
          </div>
          {byDate.length === 0 ? (
            <div className="p-8 text-center text-neutral-400 text-sm">Aucune donnée</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#0A0A0A] border-b border-neutral-800">
                <tr className="text-left text-xs uppercase tracking-wider text-neutral-400">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Requêtes</th>
                  <th className="px-4 py-3 text-right">Tok in</th>
                  <th className="px-4 py-3 text-right">Tok out</th>
                  <th className="px-4 py-3 text-right">Coût (€)</th>
                </tr>
              </thead>
              <tbody>
                {byDate
                  .slice()
                  .reverse()
                  .map((d) => (
                    <tr key={d.date} className="border-b border-neutral-800 hover:bg-[#1a1a1a]">
                      <td className="px-4 py-2 font-bold">{d.date}</td>
                      <td className="px-4 py-2 text-right text-[#38BDF8]">{d.requests}</td>
                      <td className="px-4 py-2 text-right text-neutral-400">
                        {d.tokens_in.toLocaleString('fr-BE')}
                      </td>
                      <td className="px-4 py-2 text-right text-neutral-400">
                        {d.tokens_out.toLocaleString('fr-BE')}
                      </td>
                      <td className="px-4 py-2 text-right text-[#D4AF37] font-bold">
                        {d.cost_eur.toFixed(3)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-6 text-xs text-neutral-500 italic">
          Modèle facturé : claude-sonnet-4 · Tarif : 3 $/Mtok in · 15 $/Mtok out · Conversion USD→EUR ≈ 0.92
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#141414] border border-neutral-800 rounded-xl p-4">
      <div className="text-xs text-neutral-400 uppercase tracking-wide mb-2">{label}</div>
      <div className="text-2xl font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
