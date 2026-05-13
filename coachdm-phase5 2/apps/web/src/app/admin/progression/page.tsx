// =====================================================================
// Coach DM · Phase 5 · /admin/progression
// Liste des clients du coach, triée par score d'activité 30j
// =====================================================================

import Link from 'next/link';
import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface ClientRow {
  client_id: string;
  client_name: string;
  client_email: string;
  active_days_30d: number;
  total_workouts_30d: number;
  latest_weight: number | null;
  delta_weight_30d: number | null;
  latest_pr_at: string | null;
}

export default async function ProgressionListPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Verify coach role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'coach' && profile.role !== 'super_admin')) {
    redirect('/');
  }

  // List clients of this coach
  const { data: clients } = await supabase
    .from('coach_clients')
    .select(
      `
      client_id,
      client:profiles!coach_clients_client_id_fkey ( id, full_name, email )
    `
    )
    .eq('coach_id', user.id)
    .eq('status', 'active');

  if (!clients) {
    return (
      <main style={pageStyle}>
        <h1 style={titleStyle}>Progression — Clients</h1>
        <p style={{ color: '#A1A1AA' }}>Aucun client actif.</p>
      </main>
    );
  }

  // Aggregate per client
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const since30Iso = new Date(Date.now() - 30 * 86400000).toISOString();

  const rows: ClientRow[] = await Promise.all(
    clients.map(async (cc: any) => {
      const clientId = cc.client_id;

      const [actsRes, latestWRes, oldestWRes, latestPrRes] = await Promise.all([
        supabase.from('daily_activity').select('*').eq('user_id', clientId).gte('day', since30),
        supabase
          .from('body_metrics')
          .select('weight_kg, measured_at')
          .eq('user_id', clientId)
          .not('weight_kg', 'is', null)
          .order('measured_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('body_metrics')
          .select('weight_kg')
          .eq('user_id', clientId)
          .not('weight_kg', 'is', null)
          .gte('measured_at', since30Iso)
          .order('measured_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('personal_records')
          .select('achieved_at')
          .eq('user_id', clientId)
          .order('achieved_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const acts = (actsRes.data ?? []) as any[];
      const activeDays = acts.filter((a) => a.intensity > 0).length;
      const totalWorkouts = acts.reduce((s, a) => s + a.workout_count, 0);
      const latest = latestWRes.data?.weight_kg ?? null;
      const oldest = oldestWRes.data?.weight_kg ?? null;
      const delta =
        latest !== null && oldest !== null ? Math.round((latest - oldest) * 100) / 100 : null;

      return {
        client_id: clientId,
        client_name: cc.client?.full_name ?? 'Sans nom',
        client_email: cc.client?.email ?? '—',
        active_days_30d: activeDays,
        total_workouts_30d: totalWorkouts,
        latest_weight: latest,
        delta_weight_30d: delta,
        latest_pr_at: latestPrRes.data?.achieved_at ?? null,
      };
    })
  );

  rows.sort((a, b) => b.active_days_30d - a.active_days_30d);

  return (
    <main style={pageStyle}>
      <h1 style={titleStyle}>Progression — Clients</h1>
      <p style={subStyle}>Triés par activité sur 30 jours · {rows.length} clients</p>

      <div style={{ display: 'grid', gap: 12 }}>
        {rows.map((r) => (
          <Link
            key={r.client_id}
            href={`/admin/progression/${r.client_id}`}
            style={cardStyle}
          >
            <div style={{ flex: 1 }}>
              <div style={nameStyle}>{r.client_name}</div>
              <div style={emailStyle}>{r.client_email}</div>
            </div>
            <div style={statBoxStyle}>
              <div style={statLabelStyle}>Jours actifs</div>
              <div
                style={{
                  ...statValueStyle,
                  color: r.active_days_30d >= 20 ? '#10B981' : r.active_days_30d >= 10 ? '#D4AF37' : '#EF4444',
                }}
              >
                {r.active_days_30d}<span style={statUnitStyle}>/30</span>
              </div>
            </div>
            <div style={statBoxStyle}>
              <div style={statLabelStyle}>Séances</div>
              <div style={statValueStyle}>{r.total_workouts_30d}</div>
            </div>
            <div style={statBoxStyle}>
              <div style={statLabelStyle}>Poids</div>
              <div style={statValueStyle}>
                {r.latest_weight !== null ? `${r.latest_weight.toFixed(1)} kg` : '—'}
              </div>
              {r.delta_weight_30d !== null ? (
                <div
                  style={{
                    fontSize: 11,
                    color:
                      r.delta_weight_30d > 0
                        ? '#EF4444'
                        : r.delta_weight_30d < 0
                        ? '#10B981'
                        : '#A1A1AA',
                  }}
                >
                  {r.delta_weight_30d > 0 ? '+' : ''}
                  {r.delta_weight_30d.toFixed(1)} kg
                </div>
              ) : null}
            </div>
            <div style={{ color: '#D4AF37', fontSize: 20 }}>→</div>
          </Link>
        ))}
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#0A0A0A',
  padding: '32px 24px',
  color: '#FFF',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};
const titleStyle: React.CSSProperties = {
  color: '#D4AF37',
  fontSize: 32,
  fontWeight: 800,
  margin: 0,
};
const subStyle: React.CSSProperties = { color: '#A1A1AA', fontSize: 13, marginTop: 6, marginBottom: 24 };
const cardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  backgroundColor: '#171717',
  padding: 18,
  borderRadius: 10,
  textDecoration: 'none',
  color: 'inherit',
  border: '1px solid #27272A',
};
const nameStyle: React.CSSProperties = { fontSize: 16, fontWeight: 700 };
const emailStyle: React.CSSProperties = { color: '#A1A1AA', fontSize: 12 };
const statBoxStyle: React.CSSProperties = { textAlign: 'center', minWidth: 80 };
const statLabelStyle: React.CSSProperties = {
  color: '#A1A1AA',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};
const statValueStyle: React.CSSProperties = { color: '#FFF', fontSize: 17, fontWeight: 700, marginTop: 2 };
const statUnitStyle: React.CSSProperties = { color: '#A1A1AA', fontSize: 11, fontWeight: 400 };
