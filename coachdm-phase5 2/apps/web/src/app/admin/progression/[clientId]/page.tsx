// =====================================================================
// Coach DM · Phase 5 · /admin/progression/[clientId]
// Vue détaillée d'un client : poids, mensurations, PRs, calendrier
// =====================================================================

import { createServerClient } from '@/lib/supabase-server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ClientProgressionView } from './ClientProgressionView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ clientId: string }>;
}

export default async function ClientProgressionPage({ params }: PageProps) {
  const { clientId } = await params;
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Verify coach-client link
  const { data: link } = await supabase
    .from('coach_clients')
    .select('id, status')
    .eq('coach_id', user.id)
    .eq('client_id', clientId)
    .eq('status', 'active')
    .maybeSingle();

  // Allow super_admin to view any client
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  if (!link && profile?.role !== 'super_admin') notFound();

  // Load client data
  const { data: client } = await supabase
    .from('profiles')
    .select('id, full_name, email, language')
    .eq('id', clientId)
    .single();

  if (!client) notFound();

  // 90 days of metrics
  const since90 = new Date(Date.now() - 90 * 86400000).toISOString();
  const since90Date = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);

  const [metricsRes, prsRes, actsRes, weeklyRes] = await Promise.all([
    supabase
      .from('body_metrics')
      .select('*')
      .eq('user_id', clientId)
      .gte('measured_at', since90)
      .order('measured_at', { ascending: true }),
    supabase
      .from('current_prs')
      .select('*')
      .eq('user_id', clientId)
      .order('achieved_at', { ascending: false })
      .limit(30),
    supabase
      .from('daily_activity')
      .select('*')
      .eq('user_id', clientId)
      .gte('day', since90Date)
      .order('day', { ascending: true }),
    supabase
      .from('body_metrics_weekly')
      .select('*')
      .eq('user_id', clientId)
      .order('week_start', { ascending: true }),
  ]);

  return (
    <main style={pageStyle}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin/progression" style={backLinkStyle}>
          ← Retour aux clients
        </Link>
        <h1 style={titleStyle}>{client.full_name ?? client.email}</h1>
        <p style={subStyle}>{client.email}</p>
      </div>

      <ClientProgressionView
        clientId={clientId}
        metrics={metricsRes.data ?? []}
        prs={prsRes.data ?? []}
        activities={actsRes.data ?? []}
        weekly={weeklyRes.data ?? []}
        locale={(client.language as 'fr' | 'en' | 'nl') ?? 'fr'}
      />
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
const backLinkStyle: React.CSSProperties = {
  color: '#D4AF37',
  fontSize: 13,
  textDecoration: 'none',
};
const titleStyle: React.CSSProperties = {
  color: '#D4AF37',
  fontSize: 32,
  fontWeight: 800,
  margin: '8px 0 4px',
};
const subStyle: React.CSSProperties = { color: '#A1A1AA', fontSize: 13 };
