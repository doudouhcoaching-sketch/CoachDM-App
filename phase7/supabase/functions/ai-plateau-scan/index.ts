// =====================================================================
// COACH DM · APP · PHASE 7 — IA COACH ASSISTANT
// supabase/functions/ai-plateau-scan/index.ts
// Scan plateau pour un client OU pour tous les clients d'un coach.
// Persiste les détections dans ai_plateau_detections.
// =====================================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

import { detectPlateau } from '../_shared/ai-computations.ts';
import type { AIPlateauMetric, Lang } from '../_shared/ai-types.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const INSIGHTS: Record<string, Record<Lang, string>> = {
  plateau_strength: {
    fr: 'Stagnation en force sur 4 semaines. Tentative : variation d\'angle, tempo excentrique, ou cluster sets (Verkhoshansky 1969, Issurin).',
    en: 'Strength stagnation over 4 weeks. Try angle variation, eccentric tempo, or cluster sets (Verkhoshansky 1969, Issurin).',
    nl: 'Krachtstagnatie over 4 weken. Probeer hoekvariatie, excentrische tempo of cluster sets (Verkhoshansky 1969, Issurin).',
  },
  plateau_volume: {
    fr: 'Volume hebdo stagne. Hausse progressive 5-10% ou ajout d\'un jour selon ACWR (Gabbett 2016).',
    en: 'Weekly volume stagnates. Progressive 5-10% increase or extra day per ACWR (Gabbett 2016).',
    nl: 'Wekelijks volume stagneert. Progressieve 5-10% verhoging of extra dag volgens ACWR (Gabbett 2016).',
  },
  plateau_bodyweight: {
    fr: 'Poids corporel stable. Si objectif perte : revoir TDEE et activité spontanée (Hall 2011, Mifflin-St Jeor).',
    en: 'Body weight stable. If cutting: re-check TDEE and NEAT (Hall 2011, Mifflin-St Jeor).',
    nl: 'Lichaamsgewicht stabiel. Bij cutten: herzie TDEE en NEAT (Hall 2011, Mifflin-St Jeor).',
  },
  plateau_pr_count: {
    fr: 'Aucun PR depuis 30 jours. Rotation d\'exercices recommandée (variation Bondarchuk).',
    en: 'No PR in 30 days. Exercise rotation recommended (Bondarchuk variation).',
    nl: 'Geen PR in 30 dagen. Oefeningsrotatie aanbevolen (Bondarchuk-variatie).',
  },
  plateau_rpe_drift: {
    fr: 'RPE qui dérive vers le haut sur même charge : fatigue accumulée. Déload prioritaire (Issurin block periodization).',
    en: 'RPE drifting upward on same load: accumulated fatigue. Deload priority (Issurin block periodization).',
    nl: 'RPE drift omhoog bij dezelfde belasting: opgehoopte vermoeidheid. Deload prioriteit (Issurin block periodization).',
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const body = req.method === 'POST' ? await req.json() : {};
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 3 modes :
    // - {client_id, metric} : scan métrique précise
    // - {client_id} : scan toutes métriques
    // - {} : scan tous clients (cron)
    const targets: { client_id: string; coach_id: string }[] = [];

    if (body.client_id) {
      const { data: cc } = await sb
        .from('coach_clients')
        .select('coach_id')
        .eq('client_id', body.client_id)
        .eq('is_active', true)
        .maybeSingle();
      if (cc?.coach_id) targets.push({ client_id: body.client_id, coach_id: cc.coach_id });
    } else {
      const { data: all } = await sb
        .from('coach_clients')
        .select('client_id, coach_id')
        .eq('is_active', true);
      for (const r of all ?? []) targets.push(r as any);
    }

    const metrics: AIPlateauMetric[] = body.metric
      ? [body.metric as AIPlateauMetric]
      : ['strength', 'volume', 'pr_count', 'rpe_drift'];

    const detections: any[] = [];

    for (const target of targets) {
      for (const metric of metrics) {
        const series = await fetchSeries(sb, target.client_id, metric);
        if (!series || series.length < 4) continue;

        const result = detectPlateau({
          metric,
          series,
          window_days: body.window_days ?? 28,
          exercise_id: body.exercise_id,
        });

        if (!result.isPlateau || result.confidence < 0.5) continue;

        // Ne pas dupliquer si une détection ouverte existe déjà
        const { data: existing } = await sb
          .from('ai_plateau_detections')
          .select('id')
          .eq('client_id', target.client_id)
          .eq('metric', metric)
          .is('resolved_at', null)
          .maybeSingle();
        if (existing) continue;

        const insight = INSIGHTS[result.insight_key] ?? {
          fr: 'Plateau détecté.', en: 'Plateau detected.', nl: 'Plateau gedetecteerd.',
        };

        const { data: inserted } = await sb
          .from('ai_plateau_detections')
          .insert({
            coach_id:           target.coach_id,
            client_id:          target.client_id,
            metric,
            exercise_id:        body.exercise_id ?? null,
            window_days:        body.window_days ?? 28,
            baseline:           result.baseline,
            current_value:      result.current,
            delta_pct:          result.delta_pct,
            confidence:         result.confidence,
            insight_fr:         insight.fr,
            insight_en:         insight.en,
            insight_nl:         insight.nl,
            recommended_action: result.recommended_action ?? null,
          })
          .select()
          .single();

        if (inserted) detections.push(inserted);
      }
    }

    return new Response(JSON.stringify({ detections, scanned: targets.length }), {
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  } catch (err) {
    console.error('ai-plateau-scan error', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
});

// Récupère une série temporelle pour la métrique donnée.
// Défensif : retourne null si la table n'existe pas.
async function fetchSeries(
  sb: any,
  clientId: string,
  metric: AIPlateauMetric
): Promise<{ t: number; v: number }[] | null> {
  try {
    switch (metric) {
      case 'strength': {
        // Best estimated 1RM par session (Phase 2)
        const { data } = await sb
          .from('workout_sessions')
          .select('completed_at, best_e1rm_kg')
          .eq('client_id', clientId)
          .not('best_e1rm_kg', 'is', null)
          .order('completed_at', { ascending: true })
          .limit(60);
        return (data ?? []).map((r: any) => ({ t: new Date(r.completed_at).getTime(), v: Number(r.best_e1rm_kg) }));
      }
      case 'volume': {
        const { data } = await sb
          .from('analytics_weekly')
          .select('week_start, volume_kg')
          .eq('client_id', clientId)
          .order('week_start', { ascending: true })
          .limit(16);
        return (data ?? []).map((r: any) => ({ t: new Date(r.week_start).getTime(), v: Number(r.volume_kg) }));
      }
      case 'bodyweight': {
        const { data } = await sb
          .from('measurements')
          .select('measured_at, weight_kg')
          .eq('client_id', clientId)
          .not('weight_kg', 'is', null)
          .order('measured_at', { ascending: true })
          .limit(60);
        return (data ?? []).map((r: any) => ({ t: new Date(r.measured_at).getTime(), v: Number(r.weight_kg) }));
      }
      case 'pr_count': {
        // Cumul de PRs par semaine
        const { data } = await sb
          .from('personal_records')
          .select('achieved_at')
          .eq('client_id', clientId)
          .order('achieved_at', { ascending: true })
          .limit(200);
        if (!data) return null;
        // Bucket weekly
        const buckets: Record<string, number> = {};
        for (const r of data) {
          const d = new Date(r.achieved_at);
          const k = `${d.getFullYear()}-${weekNumber(d)}`;
          buckets[k] = (buckets[k] ?? 0) + 1;
        }
        return Object.entries(buckets).map(([k, v]) => {
          const [y, w] = k.split('-').map(Number);
          return { t: weekToTime(y, w), v };
        });
      }
      case 'rpe_drift': {
        const { data } = await sb
          .from('recovery_daily')
          .select('date, rpe_session')
          .eq('client_id', clientId)
          .not('rpe_session', 'is', null)
          .order('date', { ascending: true })
          .limit(60);
        return (data ?? []).map((r: any) => ({ t: new Date(r.date).getTime(), v: Number(r.rpe_session) }));
      }
    }
  } catch {
    return null;
  }
  return null;
}

function weekNumber(d: Date): number {
  const onejan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
}
function weekToTime(y: number, w: number): number {
  return new Date(y, 0, 1 + (w - 1) * 7).getTime();
}
