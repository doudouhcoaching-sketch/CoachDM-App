// apps/web/app/coach/page.tsx
// ============================================================
// Coach DM · Web · Coach dashboard (desktop)
// ============================================================

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  createCoachClient,
  createCheckInsClient,
  createMessagingClient,
  type CheckInWithPhotos,
} from '@coachdm/shared/coach';
import { useSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export default function CoachDashboardWeb() {
  const supabase = useSupabase();
  const { user, profile } = useAuth();

  const coach = useMemo(() => createCoachClient(supabase), [supabase]);
  const checkIns = useMemo(() => createCheckInsClient(supabase), [supabase]);
  const messaging = useMemo(() => createMessagingClient(supabase), [supabase]);

  const [clients, setClients] = useState<any[]>([]);
  const [pending, setPending] = useState<CheckInWithPhotos[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const isCoach = profile?.role === 'coach' || profile?.role === 'super_admin';

  useEffect(() => {
    if (!isCoach) {
      setLoading(false);
      return;
    }
    (async () => {
      const [c, p, t] = await Promise.all([
        coach.listMyClients('active'),
        checkIns.listPendingForCoach(),
        messaging.listThreads(),
      ]);
      setClients(c);
      setPending(p);
      setUnread(
        t.reduce(
          (sum, x) => sum + (x.coach_user_id === user?.id ? x.coach_unread_count : 0),
          0
        )
      );
      setLoading(false);
    })();
  }, [isCoach]);

  if (!isCoach) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-amber-400 font-bold text-lg">Accès coach uniquement</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-400">Tableau de bord</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {profile?.full_name} ·{' '}
            {profile?.role === 'super_admin' ? 'Super admin' : 'Coach'}
          </p>
        </div>

        {loading ? (
          <p className="text-zinc-500">Chargement…</p>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Stat
                href="/coach/clients"
                label="Clients actifs"
                value={clients.length}
                color="text-emerald-400"
                icon="👥"
              />
              <Stat
                href="/coach/reviews"
                label="Check-ins à valider"
                value={pending.length}
                color={pending.length > 0 ? 'text-amber-400' : 'text-zinc-400'}
                highlight={pending.length > 0}
                icon="📋"
              />
              <Stat
                href="/messages"
                label="Messages non lus"
                value={unread}
                color={unread > 0 ? 'text-rose-400' : 'text-zinc-400'}
                highlight={unread > 0}
                icon="💬"
              />
            </div>

            {/* Pending reviews */}
            {pending.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-bold text-amber-400 mb-3">
                  À examiner cette semaine
                </h2>
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 divide-y divide-zinc-800">
                  {pending.slice(0, 8).map((p) => (
                    <Link
                      key={p.id}
                      href={`/coach/checkins/${p.id}`}
                      className="flex items-center justify-between p-4 hover:bg-zinc-800/40 transition"
                    >
                      <div>
                        <div className="font-semibold">
                          Check-in semaine du{' '}
                          {new Date(p.week_start_date).toLocaleDateString('fr-BE')}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          Soumis{' '}
                          {p.submitted_at &&
                            new Date(p.submitted_at).toLocaleDateString('fr-BE')}
                        </div>
                      </div>
                      <span className="text-amber-400">→</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Clients */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-amber-400">Mes clients</h2>
                <Link
                  href="/coach/clients/add"
                  className="text-amber-400 text-sm font-semibold hover:text-amber-300"
                >
                  + Ajouter
                </Link>
              </div>
              {clients.length === 0 ? (
                <p className="text-zinc-500 text-center py-12 bg-zinc-900 rounded-xl">
                  Aucun client pour le moment.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {clients.map((c) => (
                    <Link
                      key={c.id}
                      href={`/coach/clients/${c.client_user_id}`}
                      className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-4 flex items-center gap-3 transition"
                    >
                      <div className="w-12 h-12 rounded-full bg-amber-400 text-black flex items-center justify-center font-bold">
                        {(c.client_full_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">
                          {c.client_full_name || c.client_email}
                        </div>
                        <div className="text-xs text-zinc-500 truncate">
                          {c.client_email}
                        </div>
                      </div>
                      <span className="text-zinc-600">→</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({
  href,
  label,
  value,
  color,
  highlight,
  icon,
}: {
  href: string;
  label: string;
  value: number;
  color: string;
  highlight?: boolean;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className={`block bg-zinc-900 hover:bg-zinc-800 border rounded-xl p-5 transition ${
        highlight ? 'border-amber-400/50' : 'border-zinc-800'
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-2xl">{icon}</span>
        <span className={`text-3xl font-bold ${color}`}>{value}</span>
      </div>
      <div className="text-zinc-400 text-sm mt-3">{label}</div>
    </Link>
  );
}
