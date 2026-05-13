'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { AIConversation, AIMessage, AIIntent } from '@coachdm/shared/ai';

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type ConversationRow = AIConversation & { client_name?: string | null };

const INTENT_LABEL_FR: Record<AIIntent, string> = {
  general: 'Général',
  program_adjust: 'Ajustement',
  plateau_check: 'Plateau',
  recovery_reco: 'Récupération',
  session_suggest: 'Séance',
  nutrition_query: 'Nutrition',
  community_summary: 'Communauté',
};

export default function AdminAIConversationsPage() {
  const [items, setItems] = useState<ConversationRow[]>([]);
  const [selected, setSelected] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [intentFilter, setIntentFilter] = useState<AIIntent | 'all'>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let query = sb
      .from('ai_conversations')
      .select('id, coach_id, client_id, title, intent, status, last_msg_at, created_at, updated_at')
      .order('last_msg_at', { ascending: false, nullsFirst: false })
      .limit(200);

    if (intentFilter !== 'all') query = query.eq('intent', intentFilter);
    if (search.trim().length > 1) query = query.ilike('title', `%${search.trim()}%`);

    const { data: convs } = await query;
    if (!convs) {
      setItems([]);
      setLoading(false);
      return;
    }

    // Enrich with client names
    const clientIds = Array.from(new Set(convs.map((c: any) => c.client_id))).filter(Boolean);
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

    setItems(
      (convs as any[]).map((c) => ({ ...c, client_name: names[c.client_id] ?? c.client_id.slice(0, 8) })),
    );
    setLoading(false);
  }, [intentFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const openConv = async (c: ConversationRow) => {
    setSelected(c);
    const { data } = await sb
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', c.id)
      .order('created_at', { ascending: true });
    setMessages((data as any) ?? []);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#D4AF37]">IA · Conversations</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Supervision de toutes les conversations IA des clients
          </p>
        </div>

        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Rechercher par titre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-[#141414] border border-neutral-800 rounded-lg px-4 py-2 text-sm focus:border-[#D4AF37] outline-none"
          />
          <select
            value={intentFilter}
            onChange={(e) => setIntentFilter(e.target.value as any)}
            className="bg-[#141414] border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-[#D4AF37] outline-none"
          >
            <option value="all">Tous les intents</option>
            {(Object.keys(INTENT_LABEL_FR) as AIIntent[]).map((i) => (
              <option key={i} value={i}>
                {INTENT_LABEL_FR[i]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Liste */}
          <div className="lg:col-span-1 bg-[#141414] rounded-xl border border-neutral-800 overflow-hidden max-h-[75vh] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-neutral-400 text-sm">Chargement…</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 text-sm">Aucune conversation</div>
            ) : (
              items.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openConv(c)}
                  className={`w-full text-left p-3 border-b border-neutral-800 hover:bg-[#1a1a1a] transition ${
                    selected?.id === c.id ? 'bg-[#1a1a1a] border-l-2 border-l-[#D4AF37]' : ''
                  }`}
                >
                  <div className="text-sm font-semibold text-white truncate">
                    {c.title ?? '(sans titre)'}
                  </div>
                  <div className="text-xs text-neutral-400 mt-1 flex items-center gap-2">
                    <span className="text-[#D4AF37]">{c.client_name}</span>
                    <span>·</span>
                    <span>{INTENT_LABEL_FR[c.intent]}</span>
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {new Date(c.last_msg_at ?? c.created_at).toLocaleString('fr-BE', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Détail */}
          <div className="lg:col-span-2 bg-[#141414] rounded-xl border border-neutral-800 p-4 max-h-[75vh] overflow-y-auto">
            {!selected ? (
              <div className="text-center text-neutral-400 text-sm py-12">
                Sélectionne une conversation
              </div>
            ) : (
              <div>
                <div className="border-b border-neutral-800 pb-3 mb-4">
                  <div className="text-base font-bold">{selected.title ?? '(sans titre)'}</div>
                  <div className="text-xs text-neutral-400 mt-1">
                    {selected.client_name} · {INTENT_LABEL_FR[selected.intent]} · {selected.status}
                  </div>
                </div>
                <div className="space-y-3">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-lg text-sm ${
                        m.role === 'user'
                          ? 'bg-[#1F2937] ml-12'
                          : m.role === 'tool'
                            ? 'bg-[#0A0A0A] border border-neutral-800 text-xs text-neutral-500 italic mx-12'
                            : 'bg-[#0A0A0A] border border-neutral-800 mr-12'
                      }`}
                    >
                      <div className="text-xs text-[#D4AF37] font-bold mb-1 uppercase tracking-wide">
                        {m.role}
                        {m.tokens_in || m.tokens_out
                          ? ` · ${m.tokens_in ?? 0}→${m.tokens_out ?? 0} tok`
                          : ''}
                        {m.latency_ms ? ` · ${m.latency_ms}ms` : ''}
                      </div>
                      <div className="whitespace-pre-wrap text-white">{m.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
