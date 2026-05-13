'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type {
  AIPlanAdjustment,
  AIAdjustmentStatus,
  AIAdjustmentKind,
  AIProposedChange,
  AIEvidence,
} from '@coachdm/shared/ai';

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Row = AIPlanAdjustment & { client_name?: string | null };

const STATUS_COLOR: Record<AIAdjustmentStatus, string> = {
  proposed: '#F59E0B',
  accepted: '#10B981',
  rejected: '#EF4444',
  applied: '#D4AF37',
  expired: '#6B7280',
};

const KIND_LABEL_FR: Record<AIAdjustmentKind, string> = {
  deload: 'Décharge',
  intensify: 'Intensification',
  swap_exercise: 'Swap exercice',
  add_volume: 'Ajout volume',
  reduce_volume: 'Réduction volume',
  change_split: 'Changement split',
  add_recovery: 'Ajout récup',
};

const STATUS_LABEL_FR: Record<AIAdjustmentStatus, string> = {
  proposed: 'Proposé',
  accepted: 'Accepté',
  rejected: 'Rejeté',
  applied: 'Appliqué',
  expired: 'Expiré',
};

export default function AdminAIAdjustmentsPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [statusFilter, setStatusFilter] = useState<AIAdjustmentStatus | 'all'>('proposed');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = sb
      .from('ai_plan_adjustments')
      .select(
        'id, coach_id, client_id, conversation_id, kind, status, summary_fr, summary_en, summary_nl, rationale_fr, rationale_en, rationale_nl, proposed_changes, evidence, validation_warnings, expires_at, decided_at, applied_at, created_at, updated_at',
      )
      .order('created_at', { ascending: false })
      .limit(200);

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);

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
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const doAction = async (newStatus: AIAdjustmentStatus) => {
    if (!selected) return;
    setActing(true);
    try {
      const patch: any = { status: newStatus };
      if (newStatus === 'accepted' || newStatus === 'rejected') patch.decided_at = new Date().toISOString();
      if (newStatus === 'applied') patch.applied_at = new Date().toISOString();
      const { error } = await sb.from('ai_plan_adjustments').update(patch).eq('id', selected.id);
      if (error) throw error;
      await load();
      setSelected((prev) => (prev ? { ...prev, status: newStatus } : null));
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#D4AF37]">IA · Ajustements de plan</h1>
          <p className="text-sm text-neutral-400 mt-1">Validation manuelle des changements proposés par l'IA</p>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {(['proposed', 'accepted', 'rejected', 'applied', 'expired', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 text-xs font-bold rounded-lg border transition ${
                statusFilter === s
                  ? 'bg-[#D4AF37] border-[#D4AF37] text-black'
                  : 'bg-[#141414] border-neutral-800 text-neutral-400 hover:border-[#D4AF37]'
              }`}
            >
              {s === 'all' ? 'TOUS' : STATUS_LABEL_FR[s].toUpperCase()}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Liste */}
          <div className="lg:col-span-1 bg-[#141414] rounded-xl border border-neutral-800 overflow-hidden max-h-[75vh] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-neutral-400 text-sm">Chargement…</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 text-sm">Aucun ajustement</div>
            ) : (
              items.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`w-full text-left p-3 border-b border-neutral-800 hover:bg-[#1a1a1a] transition ${
                    selected?.id === r.id ? 'bg-[#1a1a1a] border-l-2 border-l-[#D4AF37]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#D4AF37]">{KIND_LABEL_FR[r.kind]}</span>
                    <span
                      className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border"
                      style={{ color: STATUS_COLOR[r.status], borderColor: STATUS_COLOR[r.status] }}
                    >
                      {STATUS_LABEL_FR[r.status]}
                    </span>
                  </div>
                  <div className="text-xs text-white truncate">{r.summary_fr ?? '(sans résumé)'}</div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {r.client_name} · {new Date(r.created_at).toLocaleDateString('fr-BE')}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Détail */}
          <div className="lg:col-span-2 bg-[#141414] rounded-xl border border-neutral-800 p-5 max-h-[75vh] overflow-y-auto">
            {!selected ? (
              <div className="text-center text-neutral-400 text-sm py-12">Sélectionne un ajustement</div>
            ) : (
              <DetailView row={selected} acting={acting} doAction={doAction} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailView({
  row,
  acting,
  doAction,
}: {
  row: Row;
  acting: boolean;
  doAction: (s: AIAdjustmentStatus) => void;
}) {
  const changes: AIProposedChange[] = Array.isArray(row.proposed_changes) ? (row.proposed_changes as any) : [];
  const evidence: AIEvidence[] = Array.isArray(row.evidence) ? (row.evidence as any) : [];
  const warnings: string[] = Array.isArray(row.validation_warnings) ? (row.validation_warnings as any) : [];

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">{KIND_LABEL_FR[row.kind]}</h2>
          <p className="text-xs text-neutral-400 mt-1">
            {row.client_name} · créé le {new Date(row.created_at).toLocaleString('fr-BE')}
          </p>
        </div>
        <span
          className="text-xs uppercase tracking-wider font-bold px-3 py-1 rounded border"
          style={{ color: STATUS_COLOR[row.status], borderColor: STATUS_COLOR[row.status] }}
        >
          {STATUS_LABEL_FR[row.status]}
        </span>
      </div>

      {row.summary_fr && (
        <div className="mb-4">
          <div className="text-xs font-bold text-[#D4AF37] uppercase tracking-wide mb-1">Résumé</div>
          <p className="text-sm text-white">{row.summary_fr}</p>
          {row.summary_en && <p className="text-xs text-neutral-400 mt-1">EN · {row.summary_en}</p>}
          {row.summary_nl && <p className="text-xs text-neutral-500 italic mt-1">NL · {row.summary_nl}</p>}
        </div>
      )}

      {row.rationale_fr && (
        <div className="mb-4">
          <div className="text-xs font-bold text-[#D4AF37] uppercase tracking-wide mb-1">Rationale</div>
          <p className="text-sm text-neutral-300 leading-relaxed">{row.rationale_fr}</p>
        </div>
      )}

      {changes.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-bold text-[#D4AF37] uppercase tracking-wide mb-2">Changements</div>
          <div className="space-y-2">
            {changes.map((c, i) => (
              <div key={i} className="bg-[#0A0A0A] border border-neutral-800 rounded-lg p-3">
                <div className="text-sm font-bold">{c.target}</div>
                <div className="text-xs text-[#D4AF37] font-bold mt-1">
                  {c.from !== undefined ? `${c.from} → ` : ''}
                  {c.to !== undefined ? String(c.to) : ''}
                  {c.unit ? ` ${c.unit}` : ''}
                </div>
                {c.note && <div className="text-xs text-neutral-400 italic mt-1">{c.note}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {evidence.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-bold text-[#D4AF37] uppercase tracking-wide mb-2">Références</div>
          <div className="space-y-2">
            {evidence.map((e, i) => (
              <div key={i} className="bg-[#0A0A0A] border border-neutral-800 rounded-lg p-2">
                <div className="text-xs font-bold text-[#D4AF37]">
                  {e.author}
                  {e.year ? ` (${e.year})` : ''}
                </div>
                {e.note && <div className="text-xs text-neutral-400 mt-1">{e.note}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mb-4 bg-[#1a1408] border border-[#F59E0B]/50 rounded-lg p-3">
          <div className="text-xs font-bold text-[#F59E0B] uppercase tracking-wide mb-2">⚠ Avertissements</div>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-xs text-neutral-300">
                • {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {row.expires_at && (
        <div className="text-xs text-neutral-500 mb-4">
          Expire le {new Date(row.expires_at).toLocaleString('fr-BE')}
        </div>
      )}

      {row.status === 'proposed' && (
        <div className="flex gap-2 pt-4 border-t border-neutral-800">
          <button
            onClick={() => doAction('rejected')}
            disabled={acting}
            className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#EF4444] text-[#EF4444] font-bold rounded-lg hover:bg-[#EF4444]/10 transition disabled:opacity-50"
          >
            Rejeter
          </button>
          <button
            onClick={() => doAction('accepted')}
            disabled={acting}
            className="flex-1 px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50"
          >
            Accepter
          </button>
        </div>
      )}

      {row.status === 'accepted' && (
        <button
          onClick={() => doAction('applied')}
          disabled={acting}
          className="w-full px-4 py-3 bg-[#D4AF37] text-black font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50"
        >
          Marquer comme appliqué
        </button>
      )}
    </div>
  );
}
