// =====================================================================
// Coach DM · Phase 5 · POST /api/progression/recompute
// Relais sécurisé vers l'Edge Function progression-recompute
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    const supabase = createServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Forward to edge function with caller's JWT
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const edgeRes = await fetch(`${supabaseUrl}/functions/v1/progression-recompute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ user_id: body.user_id }),
    });

    const data = await edgeRes.json();
    return NextResponse.json(data, { status: edgeRes.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 });
  }
}
