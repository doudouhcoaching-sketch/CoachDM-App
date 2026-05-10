// ═══════════════════════════════════════════════════════════════════════════
// COACH DM · Phase 4 · Web · API · POST /api/recovery/recompute
// ═══════════════════════════════════════════════════════════════════════════
// Force le recalcul du Recovery Score pour un client donné
// (le coach peut le déclencher manuellement, sinon pg_cron le fait à 03:00 UTC)
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const clientId = body.client_id || user.id;

  // Vérifier que l'appelant est : (a) le client lui-même, (b) un coach assigné, ou (c) super_admin
  if (clientId !== user.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      const { data: link } = await supabase
        .from('coach_clients')
        .select('id')
        .eq('coach_id', user.id)
        .eq('client_id', clientId)
        .eq('status', 'active')
        .maybeSingle();

      if (!link) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
  }

  // Appeler la fonction SQL
  const { data, error } = await supabase.rpc('fn_compute_recovery_score', {
    p_user_id: clientId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ recovery_score: data });
}
