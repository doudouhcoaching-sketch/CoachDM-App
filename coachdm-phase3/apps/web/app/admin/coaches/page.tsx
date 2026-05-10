// apps/web/app/admin/coaches/page.tsx
// ============================================================
// Coach DM · Web · Admin · Manage coach access (super_admin only)
// ============================================================

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  createCoachClient,
  type CoachSubscription,
} from '@coachdm/shared/coach';
import { useSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type Plan = 'comp' | 'free' | 'coach_pro' | 'coach_pro_annual';

export default function AdminCoachesPage() {
  const supabase = useSupabase();
  const { profile } = useAuth();

  const coach = useMemo(() => createCoachClient(supabase), [supabase]);

  const [subs, setSubs] = useState<
    Array<CoachSubscription & { coach_display_name: string; coach_email: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [showGrant, setShowGrant] = useState(false);

  const [grantEmail, setGrantEmail] = useState('');
  const [grantPlan, setGrantPlan] = useState<Plan>('coach_pro');
  const [grantNotes, setGrantNotes] = useState('');
  const [granting, setGranting] = useState(false);

  const isSuperAdmin = profile?.role === 'super_admin';

  const load = async () => {
    if (!isSuperAdmin) return;
    const data = await coach.listCoachSubscriptions();
    setSubs(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [isSuperAdmin]);

  const grantAccess = async (e: React.MouseEvent) => {
    e.preventDefault();
    setGranting(true);
    try {
      // Find user by email
      const { data: user, error: findErr } = await supabase
        .from('profiles')
        .select('id, email')
        .ilike('email', grantEmail.trim())
        .maybeSingle();
      if (findErr) throw findErr;
      if (!user) {
        alert('Utilisateur non trouvé. Le coach doit créer un compte avant.');
        return;
      }

      await coach.grantCoachAccess({
        coachUserId: user.id,
        plan: grantPlan,
        notes: grantNotes || undefined,
      });
      setGrantEmail('');
      setGrantNotes('');
      setShowGrant(false);
      await load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGranting(false);
    }
  };

  const revoke = async (coachUserId: string) => {
    if (!confirm('Révoquer l’accès coach ?')) return;
    await coach.revokeCoachAccess(coachUserId);
    await load();
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-amber-400 text-lg font-bold">Accès refusé</p>
          <p className="text-zinc-500 text-sm mt-2">
            Cette page est réservée à l’administrateur.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-400">
              Gestion des coachs
            </h1>
            <p className="text-zinc-500 mt-1 text-sm">
              Accorder, suivre et révoquer l’accès B2B à l’app Coach DM.
            </p>
          </div>
          <button
            onClick={() => setShowGrant(true)}
            className="bg-amber-400 hover:bg-amber-500 text-black px-5 py-2.5 rounded-lg font-bold transition"
          >
            + Accorder un accès
          </button>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total coachs"
            value={subs.length}
            color="text-amber-400"
          />
          <StatCard
            label="Payants actifs"
            value={subs.filter((s) => s.status === 'active').length}
            color="text-emerald-400"
          />
          <StatCard
            label="Comp / Free"
            value={subs.filter((s) => s.status === 'comp' || s.status === 'free').length}
            color="text-blue-400"
          />
          <StatCard
            label="Annulés"
            value={subs.filter((s) => s.status === 'canceled').length}
            color="text-zinc-500"
          />
        </div>

        {/* Coaches table */}
        <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950 text-zinc-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Coach</th>
                <th className="text-left px-4 py-3">Plan</th>
                <th className="text-left px-4 py-3">Statut</th>
                <th className="text-left px-4 py-3">Période</th>
                <th className="text-left px-4 py-3">Notes</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-500">
                    Chargement…
                  </td>
                </tr>
              ) : subs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-500">
                    Aucun coach pour le moment.
                  </td>
                </tr>
              ) : (
                subs.map((s) => (
                  <tr key={s.id} className="border-t border-zinc-800 hover:bg-zinc-800/40">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">
                        {s.coach_display_name || '—'}
                      </div>
                      <div className="text-xs text-zinc-500">{s.coach_email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <PlanBadge plan={s.plan} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {s.current_period_end ? (
                        <>Renouv. {new Date(s.current_period_end).toLocaleDateString('fr-BE')}</>
                      ) : s.status === 'comp' || s.status === 'free' ? (
                        '∞ Illimité'
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs max-w-[200px] truncate">
                      {s.notes ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.status !== 'canceled' && (
                        <button
                          onClick={() => revoke(s.coach_user_id)}
                          className="text-rose-400 hover:text-rose-300 text-xs font-semibold"
                        >
                          Révoquer
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grant access modal */}
      {showGrant && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowGrant(false)}
        >
          <div
            className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md border border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-amber-400 mb-1">
              Accorder un accès coach
            </h2>
            <p className="text-zinc-500 text-xs mb-6">
              Le coach doit déjà avoir créé un compte sur l’app.
            </p>

            <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-2">
              Email du coach
            </label>
            <input
              type="email"
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              placeholder="coach@example.com"
              className="w-full bg-black text-white px-4 py-3 rounded-lg border border-zinc-700 mb-4 focus:border-amber-400 outline-none"
            />

            <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-2">
              Plan
            </label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(
                [
                  { v: 'coach_pro', label: 'Pro mensuel', sub: '€49/mo' },
                  { v: 'coach_pro_annual', label: 'Pro annuel', sub: '€490/an' },
                  { v: 'comp', label: 'Comp', sub: 'Offert' },
                  { v: 'free', label: 'Free', sub: 'Gratuit' },
                ] as Array<{ v: Plan; label: string; sub: string }>
              ).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setGrantPlan(opt.v)}
                  className={`p-3 rounded-lg border text-left transition ${
                    grantPlan === opt.v
                      ? 'border-amber-400 bg-amber-400/10'
                      : 'border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  <div className="text-sm font-bold text-white">{opt.label}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{opt.sub}</div>
                </button>
              ))}
            </div>

            <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-2">
              Notes (optionnel)
            </label>
            <textarea
              value={grantNotes}
              onChange={(e) => setGrantNotes(e.target.value)}
              rows={3}
              placeholder="Raison, contexte, partenariat…"
              className="w-full bg-black text-white px-4 py-3 rounded-lg border border-zinc-700 mb-6 focus:border-amber-400 outline-none resize-none"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowGrant(false)}
                className="flex-1 py-3 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={grantAccess}
                disabled={!grantEmail.trim() || granting}
                className="flex-1 py-3 rounded-lg bg-amber-400 hover:bg-amber-500 text-black font-bold disabled:opacity-50"
              >
                {granting ? 'Traitement…' : 'Accorder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-zinc-500 text-xs uppercase tracking-wider mt-1">
        {label}
      </div>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    coach_pro: { label: 'Pro', cls: 'bg-amber-400/15 text-amber-400' },
    coach_pro_annual: { label: 'Pro Annuel', cls: 'bg-amber-400/20 text-amber-300' },
    comp: { label: 'Comp', cls: 'bg-blue-400/15 text-blue-400' },
    free: { label: 'Free', cls: 'bg-emerald-400/15 text-emerald-400' },
  };
  const v = map[plan] ?? { label: plan, cls: 'bg-zinc-700 text-zinc-300' };
  return (
    <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${v.cls}`}>
      {v.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: '● Actif', cls: 'text-emerald-400' },
    trial: { label: '◔ Essai', cls: 'text-amber-400' },
    past_due: { label: '! En retard', cls: 'text-orange-400' },
    canceled: { label: '✕ Annulé', cls: 'text-zinc-500' },
    comp: { label: '★ Comp', cls: 'text-blue-400' },
    free: { label: '✓ Free', cls: 'text-emerald-400' },
  };
  const v = map[status] ?? { label: status, cls: 'text-zinc-400' };
  return <span className={`text-xs font-semibold ${v.cls}`}>{v.label}</span>;
}
