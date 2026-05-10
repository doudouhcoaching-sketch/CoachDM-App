// =====================================================================
// Coach DM · Phase 5 · progression-recompute Edge Function
// POST /functions/v1/progression-recompute
// Body: { user_id: string }
// Recalcule les PRs depuis l'historique workout_logs/cardio_logs/body_metrics
// =====================================================================

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RecomputeBody {
  user_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: RecomputeBody = await req.json();
    if (!body.user_id) {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify caller is the user OR an active coach of the user
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user: caller },
    } = await authClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (caller.id !== body.user_id) {
      const { data: link } = await supabase
        .from('coach_clients')
        .select('id')
        .eq('coach_id', caller.id)
        .eq('client_id', body.user_id)
        .eq('status', 'active')
        .maybeSingle();
      if (!link) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ---------------------------------------------------------------
    // Step 1 : Wipe existing PRs for this user
    // ---------------------------------------------------------------
    await supabase.from('personal_records').delete().eq('user_id', body.user_id);

    let strengthSets = 0;
    let cardioPRs = 0;
    let bodyPRs = 0;

    // ---------------------------------------------------------------
    // Step 2 : Re-trigger workout_sets (insert noop to fire trigger)
    // Strategy : SELECT all sets, then call try_insert_pr RPC for each
    // (less risky than touching the sets themselves)
    // ---------------------------------------------------------------
    const { data: sets } = await supabase
      .from('workout_sets')
      .select('id, exercise_id, load_kg, reps, workout_log_id')
      .not('load_kg', 'is', null)
      .not('reps', 'is', null);

    if (sets) {
      // Group sets by workout to compute session volume per exercise
      const setsByWorkout = new Map<string, Map<string, { vol: number; userId: string | null; achievedAt: string | null; exerciseName: string | null }>>();

      for (const s of sets) {
        const { data: wl } = await supabase
          .from('workout_logs')
          .select('user_id, started_at, completed_at')
          .eq('id', s.workout_log_id)
          .single();
        if (!wl || wl.user_id !== body.user_id) continue;

        const { data: ex } = await supabase
          .from('exercises')
          .select('name')
          .eq('id', s.exercise_id)
          .maybeSingle();

        const achievedAt = wl.completed_at ?? wl.started_at;
        const reps = s.reps as number;
        const load = s.load_kg as number;

        // 1RM estimation
        let estimated1RM: number | null = null;
        let method = 'epley';
        if (reps === 1) {
          estimated1RM = load;
          method = 'actual';
        } else if (reps <= 10) {
          estimated1RM = Math.round((load * 36) / (37 - reps) * 100) / 100;
          method = 'brzycki';
        } else {
          estimated1RM = Math.round(load * (1 + reps / 30) * 100) / 100;
          method = 'epley';
        }

        if (estimated1RM !== null) {
          const { data: ok } = await supabase.rpc('try_insert_pr', {
            p_user_id: body.user_id,
            p_category: 'strength_1rm',
            p_exercise_id: s.exercise_id,
            p_exercise_name: ex?.name ?? null,
            p_activity_type: null,
            p_value: estimated1RM,
            p_unit: 'kg',
            p_source_log_id: s.workout_log_id,
            p_source_table: 'workout_logs',
            p_calc_method: method,
            p_reps: reps,
            p_load_kg: load,
            p_achieved_at: achievedAt,
          });
          if (ok) strengthSets++;
        }

        // Accumulate session volume
        const key = s.workout_log_id as string;
        if (!setsByWorkout.has(key)) setsByWorkout.set(key, new Map());
        const exMap = setsByWorkout.get(key)!;
        const cur = exMap.get(s.exercise_id) ?? { vol: 0, userId: wl.user_id, achievedAt, exerciseName: ex?.name ?? null };
        cur.vol += load * reps;
        exMap.set(s.exercise_id, cur);
      }

      // Pass 2 : insert volume PRs
      for (const [_workoutId, exMap] of setsByWorkout) {
        for (const [exerciseId, agg] of exMap) {
          if (!agg.userId) continue;
          await supabase.rpc('try_insert_pr', {
            p_user_id: agg.userId,
            p_category: 'strength_volume',
            p_exercise_id: exerciseId,
            p_exercise_name: agg.exerciseName,
            p_activity_type: null,
            p_value: Math.round(agg.vol * 100) / 100,
            p_unit: 'kg',
            p_source_log_id: null,
            p_source_table: 'workout_logs',
            p_calc_method: null,
            p_reps: null,
            p_load_kg: null,
            p_achieved_at: agg.achievedAt,
          });
        }
      }
    }

    // ---------------------------------------------------------------
    // Step 3 : Replay cardio_logs
    // ---------------------------------------------------------------
    const { data: cardios } = await supabase
      .from('cardio_logs')
      .select('*')
      .eq('user_id', body.user_id);

    if (cardios) {
      for (const c of cardios) {
        if (c.distance_m) {
          await supabase.rpc('try_insert_pr', {
            p_user_id: body.user_id,
            p_category: 'cardio_distance',
            p_exercise_id: null,
            p_exercise_name: null,
            p_activity_type: c.activity_type,
            p_value: c.distance_m,
            p_unit: 'm',
            p_source_log_id: c.id,
            p_source_table: 'cardio_logs',
            p_calc_method: null,
            p_reps: null,
            p_load_kg: null,
            p_achieved_at: c.started_at,
          });
          cardioPRs++;
        }
        await supabase.rpc('try_insert_pr', {
          p_user_id: body.user_id,
          p_category: 'cardio_duration',
          p_exercise_id: null,
          p_exercise_name: null,
          p_activity_type: c.activity_type,
          p_value: c.duration_s,
          p_unit: 's',
          p_source_log_id: c.id,
          p_source_table: 'cardio_logs',
          p_calc_method: null,
          p_reps: null,
          p_load_kg: null,
          p_achieved_at: c.started_at,
        });
        if (c.distance_m && c.distance_m >= 1000) {
          const pace = Math.round((c.duration_s / (c.distance_m / 1000)) * 100) / 100;
          await supabase.rpc('try_insert_pr', {
            p_user_id: body.user_id,
            p_category: 'cardio_pace',
            p_exercise_id: null,
            p_exercise_name: null,
            p_activity_type: c.activity_type,
            p_value: pace,
            p_unit: 's_per_km',
            p_source_log_id: c.id,
            p_source_table: 'cardio_logs',
            p_calc_method: null,
            p_reps: null,
            p_load_kg: null,
            p_achieved_at: c.started_at,
          });
        }
      }
    }

    // ---------------------------------------------------------------
    // Step 4 : Replay body_metrics
    // ---------------------------------------------------------------
    const { data: bodies } = await supabase
      .from('body_metrics')
      .select('*')
      .eq('user_id', body.user_id);

    if (bodies) {
      for (const m of bodies) {
        if (m.weight_kg) {
          await supabase.rpc('try_insert_pr', {
            p_user_id: body.user_id,
            p_category: 'body_weight_min',
            p_exercise_id: null,
            p_exercise_name: null,
            p_activity_type: null,
            p_value: m.weight_kg,
            p_unit: 'kg',
            p_source_log_id: m.id,
            p_source_table: 'body_metrics',
            p_calc_method: null,
            p_reps: null,
            p_load_kg: null,
            p_achieved_at: m.measured_at,
          });
          await supabase.rpc('try_insert_pr', {
            p_user_id: body.user_id,
            p_category: 'body_weight_max',
            p_exercise_id: null,
            p_exercise_name: null,
            p_activity_type: null,
            p_value: m.weight_kg,
            p_unit: 'kg',
            p_source_log_id: m.id,
            p_source_table: 'body_metrics',
            p_calc_method: null,
            p_reps: null,
            p_load_kg: null,
            p_achieved_at: m.measured_at,
          });
          bodyPRs++;
        }
        if (m.body_fat_pct) {
          await supabase.rpc('try_insert_pr', {
            p_user_id: body.user_id,
            p_category: 'body_fat_min',
            p_exercise_id: null,
            p_exercise_name: null,
            p_activity_type: null,
            p_value: m.body_fat_pct,
            p_unit: '%',
            p_source_log_id: m.id,
            p_source_table: 'body_metrics',
            p_calc_method: null,
            p_reps: null,
            p_load_kg: null,
            p_achieved_at: m.measured_at,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        user_id: body.user_id,
        strength_pr_attempts: strengthSets,
        cardio_pr_attempts: cardioPRs,
        body_pr_attempts: bodyPRs,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
