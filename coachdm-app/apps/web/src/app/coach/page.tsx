// ═══════════════════════════════════════════════════════════════
// COACH DM — /coach (dashboard business)
// 
// KPIs : abonnés actifs, MRR, conversion trial, churn, etc.
// ═══════════════════════════════════════════════════════════════

import { Users, TrendingUp, Euro, UserPlus } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';

export default async function CoachDashboardPage() {
  const admin = createAdminClient();

  // KPIs en parallèle
  const [
    { count: totalUsers },
    { count: activeSubs },
    { count: trialingSubs },
    { count: thisMonthSignups },
    { data: recentSubs },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
    admin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'trialing'),
    admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', firstOfMonth()),
    admin
      .from('subscriptions')
      .select('*, profile:profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const mrr = ((activeSubs ?? 0) * 19.99).toFixed(2);
  const conversionRate =
    totalUsers && totalUsers > 0
      ? (((activeSubs ?? 0) / totalUsers) * 100).toFixed(1)
      : '0';

  return (
    <div className="container-cdm py-12">
      <h1 className="text-4xl font-black mb-2 tracking-tight">Vue d'ensemble</h1>
      <p className="text-muted mb-10">KPIs business Coach DM en temps réel</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <KPI
          icon={Users}
          label="Utilisateurs"
          value={totalUsers ?? 0}
          color="text-primary"
        />
        <KPI
          icon={TrendingUp}
          label="Abonnés actifs"
          value={activeSubs ?? 0}
          sub={`${conversionRate}% conversion`}
          color="text-accent-fiber"
        />
        <KPI
          icon={Euro}
          label="MRR"
          value={`${mrr} €`}
          sub="Revenu mensuel récurrent"
          color="text-primary"
        />
        <KPI
          icon={UserPlus}
          label="Trial en cours"
          value={trialingSubs ?? 0}
          sub={`${thisMonthSignups ?? 0} signups ce mois`}
          color="text-accent-carbs"
        />
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-6">Abonnements récents</h2>
        {recentSubs && recentSubs.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-muted text-xs uppercase tracking-widest">
                <th className="text-left py-3 font-medium">Client</th>
                <th className="text-left py-3 font-medium">Statut</th>
                <th className="text-left py-3 font-medium">Renouvellement</th>
                <th className="text-right py-3 font-medium">Créé</th>
              </tr>
            </thead>
            <tbody>
              {recentSubs.map((s: any) => (
                <tr key={s.id} className="border-b border-border-subtle">
                  <td className="py-3">
                    <div>
                      <p className="font-medium">{s.profile?.full_name ?? '—'}</p>
                      <p className="text-xs text-muted-dim">{s.profile?.email ?? '—'}</p>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className={`text-xs font-bold uppercase tracking-widest ${
                      s.status === 'active' ? 'text-accent-fiber' :
                      s.status === 'trialing' ? 'text-primary' :
                      'text-muted'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3 text-muted">
                    {s.current_period_end
                      ? new Date(s.current_period_end).toLocaleDateString('fr-FR')
                      : '—'}
                  </td>
                  <td className="py-3 text-right text-muted-dim text-xs">
                    {new Date(s.created_at).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-muted">Aucun abonnement pour l'instant.</p>
        )}
      </div>
    </div>
  );
}

function KPI({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted uppercase tracking-widest font-bold">
          {label}
        </span>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-dim mt-1">{sub}</p>}
    </div>
  );
}

function firstOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}
