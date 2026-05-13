// =====================================================================
// COACH DM · APP · PHASE 7 — IA COACH ASSISTANT
// supabase/functions/ai-context-builder/index.ts
// Reconstruit le snapshot ai_client_context depuis Phase 2/4/5 tables.
// Appelé sur demande (refresh manuel) ou cron nightly.
// =====================================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const body = await req.json();
    const clientId = body.client_id as string;
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Trouver le coach
    const { data: cc } = await sb
      .from('coach_clients')
      .select('coach_id')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .maybeSingle();
    const coachId = cc?.coach_id;
    if (!coachId) {
      return json({ error: 'no_coach' }, 400);
    }

    // Profil — Phase 1 (nutrition)
    const profile = await safeFetch(sb, 'user_profiles', { user_id: clientId });
    // Macros calculées — Phase 1
    const macros = await safeFetch(sb, 'user_macros', { user_id: clientId });
    // Recovery dernière entrée — Phase 4
    const recovery = await safeFetch(sb, 'recovery_daily', { client_id: clientId }, 'date', false, 1);
    // Charge ACWR — Phase 5 (déjà SQL fn)
    const { data: acwrData } = await sb.rpc('fn_ai_acwr_safe', { p_client: clientId });
    // Volume hebdo — Phase 5
    const weekly = await safeFetch(sb, 'analytics_weekly', { client_id: clientId }, 'week_start', false, 1);
    // PRs récents — Phase 2
    const { data: prCountData } = await sb.rpc('fn_ai_pr_count_safe', { p_client: clientId });
    const lastPr = await safeFetch(sb, 'personal_records', { client_id: clientId }, 'achieved_at', false, 1);
    // Communauté — Phase 6
    const lbRank = await safeFetch(sb, 'community_leaderboard_entries', { user_id: clientId }, 'rank', true, 1);
    const challengeActive = await safeFetch(sb, 'community_challenge_participants', { user_id: clientId, status: 'active' }, undefined, false, 1);

    const snapshot = {
      profile, macros, recovery, weekly, lastPr, lbRank, challengeActive,
    };

    const payload: any = {
      client_id: clientId,
      coach_id: coachId,
      age:              profile?.age ?? null,
      sex:              profile?.sex ?? null,
      weight_kg:        profile?.weight_kg ?? null,
      height_cm:        profile?.height_cm ?? null,
      bodyfat_pct:      profile?.bodyfat_pct ?? null,
      goal:             profile?.goal ?? null,
      experience_level: profile?.experience_level ?? null,
      bmr_kcal:         macros?.bmr_kcal ?? null,
      tdee_kcal:        macros?.tdee_kcal ?? null,
      proteins_g:       macros?.proteins_g ?? null,
      carbs_g:          macros?.carbs_g ?? null,
      fats_g:           macros?.fats_g ?? null,
      acwr_7_28:        acwrData ?? null,
      weekly_volume_kg: weekly?.volume_kg ?? null,
      weekly_sessions:  weekly?.sessions_count ?? null,
      recovery_score:   recovery?.recovery_score ?? null,
      sleep_avg_h:      recovery?.sleep_hours ?? null,
      hrv_avg:          recovery?.hrv_rmssd ?? null,
      rpe_avg_7d:       recovery?.rpe_session ?? null,
      pr_count_30d:     prCountData ?? 0,
      top_pr_summary:   lastPr ? `${lastPr.exercise_name ?? 'PR'} · ${lastPr.value_kg ?? lastPr.value ?? ''}` : null,
      challenge_active: !!challengeActive,
      leaderboard_rank: lbRank?.rank ?? null,
      refreshed_at:     new Date().toISOString(),
      raw_snapshot:     snapshot,
    };

    const { data, error } = await sb
      .from('ai_client_context')
      .upsert(payload, { onConflict: 'client_id' })
      .select()
      .single();

    if (error) throw error;
    return json({ context: data });
  } catch (err) {
    console.error('ai-context-builder error', err);
    return json({ error: String(err) }, 500);
  }
});

function json(b: any, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}

async function safeFetch(
  sb: any,
  table: string,
  filters: Record<string, any>,
  orderBy?: string,
  orderAsc = false,
  limit?: number
): Promise<any> {
  // Vérifier que la table existe
  const { data: tcheck } = await sb.rpc('exec_sql_safe', {
    sql: `select 1 from information_schema.tables where table_name = '${table}' and table_schema='public' limit 1`,
  }).catch(() => ({ data: null }));

  try {
    let q = sb.from(table).select('*');
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
    if (orderBy) q = q.order(orderBy, { ascending: orderAsc });
    if (limit) q = q.limit(limit);
    const { data, error } = await (limit === 1 ? q.maybeSingle() : q);
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}
