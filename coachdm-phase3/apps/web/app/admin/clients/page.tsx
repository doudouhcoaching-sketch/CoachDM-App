// apps/web/app/admin/clients/page.tsx
// ============================================================
// Coach DM · Web · Admin · All clients overview (super_admin)
// ============================================================

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export default function AdminClientsPage() {
  const supabase = useSupabase();
  const { profile } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const isSuperAdmin = profile?.role === 'super_admin';

  useEffect(() => {
    if (!isSuperAdmin) return;
    (async () => {
      const { data, error } = await supabase
        .from('coach_clients')
        .select(`
          *,
          coach:profiles!coach_clients_coach_user_id_fkey(full_name, email),
          client:profiles!coach_clients_client_user_id_fkey(full_name, email)
        `)
        .order('started_at', { ascending: false });
      if (!error) setRows(data ?? []);
      setLoading(false);
    })();
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-amber-400 font-bold">Accès refusé</p>
      </div>
    );
  }

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (r.client?.full_name ?? '').toLowerCase().includes(s) ||
      (r.client?.email ?? '').toLowerCase().includes(s) ||
      (r.coach?.full_name ?? '').toLowerCase().includes(s) ||
      (r.coach?.email ?? '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-amber-400 mb-2">
          Tous les clients
        </h1>
        <p className="text-zinc-500 text-sm mb-8">
          Vue d’ensemble des affectations coach ↔ client.
        </p>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou email…"
          className="w-full bg-zinc-900 text-white px-4 py-3 rounded-lg border border-zinc-800 mb-6 focus:border-amber-400 outline-none"
        />

        <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950 text-zinc-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Coach</th>
                <th className="text-left px-4 py-3">Statut</th>
                <th className="text-left px-4 py-3">Depuis</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-zinc-500">
                    Chargement…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-zinc-500">
                    Aucune affectation.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-zinc-800 hover:bg-zinc-800/40"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold">
                        {r.client?.full_name ?? '—'}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {r.client?.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-amber-400">
                        {r.coach?.full_name ?? '—'}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {r.coach?.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold ${
                          r.status === 'active'
                            ? 'text-emerald-400'
                            : r.status === 'paused'
                              ? 'text-amber-400'
                              : 'text-zinc-500'
                        }`}
                      >
                        ● {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {new Date(r.started_at).toLocaleDateString('fr-BE')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
