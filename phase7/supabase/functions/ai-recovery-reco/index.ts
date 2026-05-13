// =====================================================================
// COACH DM · APP · PHASE 7 — IA COACH ASSISTANT
// supabase/functions/ai-recovery-reco/index.ts
// Calcule readiness + zone + protocole et upsert ai_recovery_recos.
// =====================================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

import { computeReadiness, buildRecoveryProtocol } from '../_shared/ai-computations.ts';
import type { Lang } from '../_shared/ai-types.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const REC_TEXT: Record<string, Record<Lang, string>> = {
  green: {
    fr: 'Tu es prêt à pousser. Charge normale, focus technique sur les exercices principaux. Sommeil 8h, mobilité 10min en fin de séance.',
    en: 'Ready to push. Normal load, technical focus on main lifts. 8h sleep, 10min mobility post-session.',
    nl: 'Klaar om te pushen. Normale belasting, technische focus op hoofdoefeningen. 8u slaap, 10min mobiliteit na de sessie.',
  },
  amber: {
    fr: 'Charge modérée. Réduis intensité de 5-10%, conserve le volume. Cardio Z2 25min en sortie, douche contrastée. Sommeil 8h30 ce soir (Mah 2011).',
    en: 'Moderate load. Reduce intensity 5-10%, keep volume. Z2 cardio 25min, contrast shower. 8h30 sleep tonight (Mah 2011).',
    nl: 'Matige belasting. Verminder intensiteit 5-10%, behoud volume. Z2 cardio 25min, contrastdouche. 8u30 slaap vannacht (Mah 2011).',
  },
  red: {
    fr: 'Jour de repos prioritaire. Mobilité 20min, douche contrastée, +50g glucides (resynthèse glycogène). Sommeil 9h cible (Mah 2011, Walker 2017). Bain froid 11°C × 10min seulement si DOMS importants (Bleakley 2012).',
    en: 'Rest day priority. 20min mobility, contrast shower, +50g carbs (glycogen resynthesis). 9h sleep target (Mah 2011, Walker 2017). Ice bath 11°C × 10min only if heavy DOMS (Bleakley 2012).',
    nl: 'Rustdag prioriteit. 20min mobiliteit, contrastdouche, +50g koolhydraten (glycogeenresynthese). 9u slaapdoel (Mah 2011, Walker 2017). IJsbad 11°C × 10min alleen bij zware DOMS (Bleakley 2012).',
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const body = await req.json();
    const clientId = body.client_id as string;
    const lang = (body.lang ?? 'fr') as Lang;
    const date = (body.date ?? new Date().toISOString().slice(0, 10)) as string;

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: cc } = await sb
      .from('coach_clients')
      .select('coach_id')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .maybeSingle();
    const coachId = cc?.coach_id;
    if (!coachId) return json({ error: 'no_coach' }, 400);

    // Snapshot recovery
    const { data: rec } = await sb.rpc('fn_ai_recovery_safe', { p_client: clientId });
    const recOne = Array.isArray(rec) ? rec[0] : rec;

    const { data: acwr } = await sb.rpc('fn_ai_acwr_safe', { p_client: clientId });

    const input = {
      acwr:           acwr ?? null,
      sleep_h:        recOne?.sleep_h ?? null,
      hrv:            recOne?.hrv ?? null,
      hrv_baseline:   null, // pourra venir d'une table baseline ultérieure
      rpe_yesterday:  recOne?.rpe_avg ?? null,
    };

    const readiness = computeReadiness(input);
    const protocol = buildRecoveryProtocol(readiness, input);
    const refs = ['Gabbett 2016', 'Mah 2011'];
    if (protocol.ice_bath) refs.push('Bleakley 2012');

    const payload = {
      coach_id:          coachId,
      client_id:         clientId,
      date,
      acwr:              input.acwr,
      sleep_h:           input.sleep_h,
      hrv:               input.hrv,
      rpe_yesterday:     input.rpe_yesterday,
      readiness:         readiness.score,
      zone:              readiness.zone,
      recommendation_fr: REC_TEXT[readiness.zone].fr,
      recommendation_en: REC_TEXT[readiness.zone].en,
      recommendation_nl: REC_TEXT[readiness.zone].nl,
      protocol,
      scientific_refs:   refs,
    };

    const { data, error } = await sb
      .from('ai_recovery_recos')
      .upsert(payload, { onConflict: 'client_id,date' })
      .select()
      .single();

    if (error) throw error;

    return json({ reco: data, contributors: readiness.contributors, flags: readiness.flags });
  } catch (err) {
    console.error('ai-recovery-reco error', err);
    return json({ error: String(err) }, 500);
  }
});

function json(b: any, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}
