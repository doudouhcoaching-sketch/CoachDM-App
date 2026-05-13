// =====================================================================
// COACH DM · APP · PHASE 7 — IA COACH ASSISTANT
// supabase/functions/ai-session-suggest/index.ts
// Propose une séance du jour adaptée au readiness + structure Coach DM.
// =====================================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

import { computeReadiness } from '../_shared/ai-computations.ts';
import type { Lang, ReadinessZone, AISessionExercise } from '../_shared/ai-types.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ---------------------------------------------------------------------
// Templates de séance par zone (structure Coach DM stricte)
// activation → sprint/plyo → force → conditionnement → récupération
// ---------------------------------------------------------------------
type SessionKind = 'strength' | 'conditioning' | 'mobility' | 'rest' | 'tactical';

interface SessionTemplate {
  kind: SessionKind;
  duration_min: number;
  rpe_target: number;
  title: { fr: string; en: string; nl: string };
  exercises: AISessionExercise[];
  rationale_key: string;
  refs: string[];
}

const TEMPLATES_GREEN: SessionTemplate = {
  kind: 'strength',
  duration_min: 75,
  rpe_target: 8,
  title: { fr: 'Force lourde · Full body', en: 'Heavy strength · Full body', nl: 'Zware kracht · Full body' },
  rationale_key: 'green_strength',
  refs: ['Schoenfeld 2017', 'Helms 2018', 'Verkhoshansky 1969'],
  exercises: [
    {
      name_fr: 'Échauffement dynamique FIFA 11+', name_en: 'FIFA 11+ dynamic warm-up', name_nl: 'FIFA 11+ dynamische warming-up',
      sets: 1, duration_s: 480, rest_s: 0,
      tip_kind: 'insight',
      tip_fr: 'Active fessiers, ischios, mobilité hanche avant lourd (Bishop 2008).',
      tip_en: 'Activate glutes, hamstrings, hip mobility before heavy work (Bishop 2008).',
      tip_nl: 'Activeer bilspieren, hamstrings, heupmobiliteit vóór zware sessie (Bishop 2008).',
    },
    {
      name_fr: 'Box Jump 60cm', name_en: 'Box Jump 60cm', name_nl: 'Box Jump 60cm',
      sets: 4, reps: 3, rest_s: 90,
      tip_kind: 'tactic',
      tip_fr: 'PAP : 5 min après squat lourd, gain explosif (Verkhoshansky 1969).',
      tip_en: 'PAP: 5 min after heavy squat, explosive gain (Verkhoshansky 1969).',
      tip_nl: 'PAP: 5 min na zware squat, explosieve winst (Verkhoshansky 1969).',
    },
    {
      name_fr: 'Back Squat', name_en: 'Back Squat', name_nl: 'Back Squat',
      sets: 5, reps: 5, rest_s: 180, intensity_pct: 0.85, rpe_target: 8,
      tip_kind: 'insight',
      tip_fr: 'Profondeur cuisses parallèles, dos neutre (McGill 2007).',
      tip_en: 'Thighs parallel, neutral spine (McGill 2007).',
      tip_nl: 'Dijen parallel, neutrale rug (McGill 2007).',
    },
    {
      name_fr: 'Hip Thrust avec barre', name_en: 'Barbell Hip Thrust', name_nl: 'Barbell Hip Thrust',
      sets: 4, reps: 8, rest_s: 120, rpe_target: 8,
      tip_kind: 'insight',
      tip_fr: 'EMG fessier max (Contreras 2017). Pause 1s en haut.',
      tip_en: 'Max glute EMG (Contreras 2017). 1s pause at top.',
      tip_nl: 'Max bilspier-EMG (Contreras 2017). 1s pauze bovenaan.',
    },
    {
      name_fr: 'Nordic Hamstring', name_en: 'Nordic Hamstring', name_nl: 'Nordic Hamstring',
      sets: 3, reps: 6, rest_s: 90,
      tip_kind: 'warning',
      tip_fr: '−51% risque lésion ischio (Askling 2003, van Dyk 2019). Excentrique contrôlé.',
      tip_en: '−51% hamstring injury risk (Askling 2003, van Dyk 2019). Controlled eccentric.',
      tip_nl: '−51% hamstringblessurerisico (Askling 2003, van Dyk 2019). Gecontroleerde excentriek.',
    },
    {
      name_fr: 'Plank dynamique', name_en: 'Dynamic Plank', name_nl: 'Dynamische Plank',
      sets: 3, duration_s: 45, rest_s: 30,
      tip_kind: 'info',
      tip_fr: 'Anti-extension lombaire (McGill 2010).',
      tip_en: 'Anti-extension lumbar (McGill 2010).',
      tip_nl: 'Anti-extensie lumbaal (McGill 2010).',
    },
    {
      name_fr: 'Foam rolling + étirements statiques', name_en: 'Foam rolling + static stretches', name_nl: 'Foam rollen + statische rekken',
      sets: 1, duration_s: 600, rest_s: 0,
      tip_kind: 'info',
      tip_fr: 'Cool-down 10min, parasympathique activé (Pearcey 2015).',
      tip_en: 'Cool-down 10min, parasympathetic activated (Pearcey 2015).',
      tip_nl: 'Cool-down 10min, parasympathicus geactiveerd (Pearcey 2015).',
    },
  ],
};

const TEMPLATES_AMBER: SessionTemplate = {
  kind: 'conditioning',
  duration_min: 50,
  rpe_target: 6.5,
  title: { fr: 'Conditionnement contrôlé · Z2', en: 'Controlled conditioning · Z2', nl: 'Gecontroleerde conditie · Z2' },
  rationale_key: 'amber_conditioning',
  refs: ['Buchheit 2010', 'Helgerud 2007', 'Gabbett 2016'],
  exercises: [
    {
      name_fr: 'Mobilité dynamique', name_en: 'Dynamic mobility', name_nl: 'Dynamische mobiliteit',
      sets: 1, duration_s: 600, rest_s: 0,
      tip_kind: 'info',
      tip_fr: 'Hanche, thoracique, cheville. Préparation parasymp → symp.',
      tip_en: 'Hip, thoracic, ankle. Parasymp → symp prep.',
      tip_nl: 'Heup, thoracaal, enkel. Parasymp → symp voorbereiding.',
    },
    {
      name_fr: 'Skips A/B', name_en: 'A/B Skips', name_nl: 'A/B Skips',
      sets: 4, duration_s: 30, rest_s: 60,
      tip_kind: 'tactic',
      tip_fr: 'Mécanique sprint sans charge axiale (ALTIS).',
      tip_en: 'Sprint mechanics without axial load (ALTIS).',
      tip_nl: 'Sprintmechaniek zonder axiale belasting (ALTIS).',
    },
    {
      name_fr: 'Goblet Squat', name_en: 'Goblet Squat', name_nl: 'Goblet Squat',
      sets: 4, reps: 10, rest_s: 75, intensity_pct: 0.65,
      tip_kind: 'info',
      tip_fr: 'Charge modérée, focus profondeur et tempo.',
      tip_en: 'Moderate load, depth and tempo focus.',
      tip_nl: 'Matige belasting, focus diepte en tempo.',
    },
    {
      name_fr: 'Z2 cardio (vélo ou rameur)', name_en: 'Z2 cardio (bike or rower)', name_nl: 'Z2 cardio (fiets of roeier)',
      sets: 1, duration_s: 1500, rest_s: 0,
      tip_kind: 'insight',
      tip_fr: '25 min Z2 = mitochondries + récupération active (San Millán 2018).',
      tip_en: '25 min Z2 = mitochondria + active recovery (San Millán 2018).',
      tip_nl: '25 min Z2 = mitochondriën + actief herstel (San Millán 2018).',
    },
    {
      name_fr: 'Copenhagen Adduction', name_en: 'Copenhagen Adduction', name_nl: 'Copenhagen Adduction',
      sets: 3, reps: 6, rest_s: 75,
      tip_kind: 'warning',
      tip_fr: '−41% blessure adducteur (Harøy 2019). Indispensable.',
      tip_en: '−41% adductor injury (Harøy 2019). Essential.',
      tip_nl: '−41% adductorblessure (Harøy 2019). Essentieel.',
    },
    {
      name_fr: 'Étirements + respiration', name_en: 'Stretching + breathing', name_nl: 'Rekken + ademhaling',
      sets: 1, duration_s: 480, rest_s: 0,
      tip_kind: 'info',
      tip_fr: 'Box breathing 4-4-4-4 × 8 cycles.',
      tip_en: 'Box breathing 4-4-4-4 × 8 cycles.',
      tip_nl: 'Box breathing 4-4-4-4 × 8 cycli.',
    },
  ],
};

const TEMPLATES_RED: SessionTemplate = {
  kind: 'rest',
  duration_min: 30,
  rpe_target: 3,
  title: { fr: 'Récupération active', en: 'Active recovery', nl: 'Actief herstel' },
  rationale_key: 'red_recovery',
  refs: ['Bleakley 2012', 'Pearcey 2015', 'Mah 2011'],
  exercises: [
    {
      name_fr: 'Marche modérée', name_en: 'Moderate walk', name_nl: 'Matige wandeling',
      sets: 1, duration_s: 1200, rest_s: 0,
      tip_kind: 'info',
      tip_fr: 'NEAT + circulation. Pas de fréquence cardiaque > 60% FCmax.',
      tip_en: 'NEAT + circulation. No HR > 60% HRmax.',
      tip_nl: 'NEAT + circulatie. Geen HR > 60% HRmax.',
    },
    {
      name_fr: 'Mobilité globale', name_en: 'Full body mobility', name_nl: 'Full body mobiliteit',
      sets: 1, duration_s: 1200, rest_s: 0,
      tip_kind: 'insight',
      tip_fr: 'CARs (FRC) hanches/épaules. Amplitude max contrôlée.',
      tip_en: 'CARs (FRC) hips/shoulders. Controlled max ROM.',
      tip_nl: 'CARs (FRC) heupen/schouders. Gecontroleerde max ROM.',
    },
    {
      name_fr: 'Douche contrastée', name_en: 'Contrast shower', name_nl: 'Contrastdouche',
      sets: 5, duration_s: 60, rest_s: 0,
      tip_kind: 'tactic',
      tip_fr: '30s chaud / 30s froid × 5 cycles. Vasoconstriction-dilatation (Bleakley 2012).',
      tip_en: '30s hot / 30s cold × 5 cycles. Vasoconstriction-dilation (Bleakley 2012).',
      tip_nl: '30s warm / 30s koud × 5 cycli. Vasoconstrictie-dilatatie (Bleakley 2012).',
    },
  ],
};

const RATIONALES: Record<string, Record<Lang, string>> = {
  green_strength: {
    fr: 'Score readiness élevé (≥75) : autorisation à charger lourd. Structure activation → plyo → force composés → prévention (Nordic, Hip Thrust) → core → cool-down. ACWR dans la zone safe (Gabbett 2016).',
    en: 'High readiness (≥75): cleared for heavy load. Structure activation → plyo → compound strength → prevention (Nordic, Hip Thrust) → core → cool-down. ACWR in safe zone (Gabbett 2016).',
    nl: 'Hoge readiness (≥75): klaar voor zware belasting. Structuur activering → plyo → samengestelde kracht → preventie (Nordic, Hip Thrust) → core → cool-down. ACWR in veilige zone (Gabbett 2016).',
  },
  amber_conditioning: {
    fr: 'Score readiness moyen (50-75) : intensité réduite, volume maintenu en Z2. Préserve la base aérobie sans empiler de fatigue (Helgerud 2007, Buchheit 2010).',
    en: 'Moderate readiness (50-75): reduced intensity, volume kept in Z2. Preserves aerobic base without stacking fatigue (Helgerud 2007, Buchheit 2010).',
    nl: 'Matige readiness (50-75): verlaagde intensiteit, volume behouden in Z2. Behoudt aerobe basis zonder vermoeidheid op te stapelen (Helgerud 2007, Buchheit 2010).',
  },
  red_recovery: {
    fr: 'Score readiness bas (<50) : forcer aujourd\'hui = blessure ou maladie. Récup active, sommeil 9h, glucides +50g (Mah 2011, Walker 2017, Bleakley 2012).',
    en: 'Low readiness (<50): pushing today = injury or illness. Active recovery, 9h sleep, +50g carbs (Mah 2011, Walker 2017, Bleakley 2012).',
    nl: 'Lage readiness (<50): doorduwen vandaag = blessure of ziekte. Actief herstel, 9u slaap, +50g koolhydraten (Mah 2011, Walker 2017, Bleakley 2012).',
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

    // Recovery snapshot
    const { data: rec } = await sb.rpc('fn_ai_recovery_safe', { p_client: clientId });
    const recOne = Array.isArray(rec) ? rec[0] : rec;
    const { data: acwr } = await sb.rpc('fn_ai_acwr_safe', { p_client: clientId });

    const readiness = computeReadiness({
      acwr:           acwr ?? null,
      sleep_h:        recOne?.sleep_h ?? null,
      hrv:            recOne?.hrv ?? null,
      hrv_baseline:   null,
      rpe_yesterday:  recOne?.rpe_avg ?? null,
    });

    const zone: ReadinessZone = readiness.zone;
    const tpl = zone === 'green' ? TEMPLATES_GREEN : zone === 'amber' ? TEMPLATES_AMBER : TEMPLATES_RED;

    const rationale = RATIONALES[tpl.rationale_key];

    const payload = {
      coach_id:        coachId,
      client_id:       clientId,
      date,
      readiness:       readiness.score,
      zone,
      suggested_kind:  tpl.kind,
      title_fr:        tpl.title.fr,
      title_en:        tpl.title.en,
      title_nl:        tpl.title.nl,
      duration_min:    tpl.duration_min,
      rpe_target:      tpl.rpe_target,
      exercises:       tpl.exercises,
      rationale_fr:    rationale.fr,
      rationale_en:    rationale.en,
      rationale_nl:    rationale.nl,
      scientific_refs: tpl.refs,
    };

    const { data, error } = await sb
      .from('ai_session_suggestions')
      .upsert(payload, { onConflict: 'client_id,date' })
      .select()
      .single();

    if (error) throw error;
    return json({ suggestion: data, readiness });
  } catch (err) {
    console.error('ai-session-suggest error', err);
    return json({ error: String(err) }, 500);
  }
});

function json(b: any, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}
