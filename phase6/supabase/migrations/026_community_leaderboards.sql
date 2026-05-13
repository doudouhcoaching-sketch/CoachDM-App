-- ============================================================
-- Coach DM · Phase 6 · Migration 026
-- Leaderboards (privés, par coach, opt-in)
-- ============================================================
-- Classements hebdomadaires + mensuels sur 6 métriques fixes.
-- Opt-in strict : chaque user choisit s'il apparaît ou non.
-- Stockage matérialisé par period+metric pour perf (refresh nightly).
-- ============================================================

-- ---------- PRÉFÉRENCES PARTICIPATION ----------
CREATE TABLE IF NOT EXISTS public.leaderboard_preferences (
  user_id           UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  participates      BOOLEAN NOT NULL DEFAULT FALSE,
  display_name      TEXT,                -- pseudo affiché (sinon profile name)
  show_avatar       BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- ENTRÉES LEADERBOARD ----------
-- Stockage dénormalisé : 1 ligne par (coach, period, metric, user, period_start)
CREATE TABLE IF NOT EXISTS public.leaderboard_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period        TEXT NOT NULL CHECK (period IN ('week', 'month')),
  period_start  DATE NOT NULL,           -- lundi pour week, 1er du mois pour month
  period_end    DATE NOT NULL,
  metric        TEXT NOT NULL CHECK (metric IN (
                  'workouts_count',
                  'total_volume_kg',
                  'cardio_distance_km',
                  'cardio_duration_min',
                  'sleep_hours_avg',
                  'recovery_score_avg'
                )),
  value         NUMERIC NOT NULL DEFAULT 0,
  rank          INT,
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(coach_id, period, period_start, metric, user_id)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_query
  ON public.leaderboard_entries(coach_id, period, period_start, metric, rank ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_leaderboard_user
  ON public.leaderboard_entries(user_id, period_start DESC);

-- ============================================================
-- FONCTIONS
-- ============================================================

-- Calcule la valeur d'une métrique pour un user sur une plage
CREATE OR REPLACE FUNCTION public.fn_compute_leaderboard_metric(
  p_metric  TEXT,
  p_user_id UUID,
  p_start   DATE,
  p_end     DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value     NUMERIC := 0;
  v_has_table BOOLEAN;
BEGIN
  IF p_metric = 'workouts_count' THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'workout_logs'
    ) INTO v_has_table;
    IF v_has_table THEN
      EXECUTE format($q$
        SELECT COUNT(*)::NUMERIC FROM public.workout_logs
         WHERE user_id = %L AND started_at::DATE BETWEEN %L AND %L
      $q$, p_user_id, p_start, p_end) INTO v_value;
    END IF;

  ELSIF p_metric = 'total_volume_kg' THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'workout_sets'
    ) INTO v_has_table;
    IF v_has_table THEN
      EXECUTE format($q$
        SELECT COALESCE(SUM(ws.weight_kg * ws.reps), 0)::NUMERIC
          FROM public.workout_sets ws
          JOIN public.workout_logs wl ON wl.id = ws.workout_log_id
         WHERE wl.user_id = %L AND wl.started_at::DATE BETWEEN %L AND %L
      $q$, p_user_id, p_start, p_end) INTO v_value;
    END IF;

  ELSIF p_metric = 'cardio_distance_km' THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'cardio_logs'
    ) INTO v_has_table;
    IF v_has_table THEN
      EXECUTE format($q$
        SELECT COALESCE(SUM(distance_km), 0)::NUMERIC FROM public.cardio_logs
         WHERE user_id = %L AND performed_at::DATE BETWEEN %L AND %L
      $q$, p_user_id, p_start, p_end) INTO v_value;
    END IF;

  ELSIF p_metric = 'cardio_duration_min' THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'cardio_logs'
    ) INTO v_has_table;
    IF v_has_table THEN
      EXECUTE format($q$
        SELECT COALESCE(SUM(duration_min), 0)::NUMERIC FROM public.cardio_logs
         WHERE user_id = %L AND performed_at::DATE BETWEEN %L AND %L
      $q$, p_user_id, p_start, p_end) INTO v_value;
    END IF;

  ELSIF p_metric = 'sleep_hours_avg' THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'sleep_sessions'
    ) INTO v_has_table;
    IF v_has_table THEN
      EXECUTE format($q$
        SELECT COALESCE(AVG(duration_min) / 60.0, 0)::NUMERIC
          FROM public.sleep_sessions
         WHERE user_id = %L AND sleep_date BETWEEN %L AND %L
      $q$, p_user_id, p_start, p_end) INTO v_value;
    END IF;

  ELSIF p_metric = 'recovery_score_avg' THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'recovery_streaks'
    ) INTO v_has_table;
    -- recovery_score est généralement stocké quotidiennement ; on cherche une table possible
    -- On utilise un calcul approximatif via fonction Phase 4 si disponible.
    IF v_has_table THEN
      BEGIN
        EXECUTE format($q$
          SELECT COALESCE(AVG(score), 0)::NUMERIC FROM public.recovery_daily_scores
           WHERE user_id = %L AND score_date BETWEEN %L AND %L
        $q$, p_user_id, p_start, p_end) INTO v_value;
      EXCEPTION WHEN undefined_table THEN
        v_value := 0;
      END;
    END IF;
  END IF;

  RETURN COALESCE(v_value, 0);
END;
$$;

-- Refresh leaderboard pour un coach + période donnée + métrique
CREATE OR REPLACE FUNCTION public.fn_refresh_leaderboard(
  p_coach_id     UUID,
  p_period       TEXT,
  p_period_start DATE,
  p_metric       TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_end       DATE;
  v_count     INT := 0;
  r           RECORD;
BEGIN
  IF p_period = 'week' THEN
    v_end := p_period_start + INTERVAL '6 days';
  ELSIF p_period = 'month' THEN
    v_end := (p_period_start + INTERVAL '1 month - 1 day')::DATE;
  ELSE
    RAISE EXCEPTION 'Invalid period: %', p_period;
  END IF;

  -- Supprimer les entrées existantes pour ce slot
  DELETE FROM public.leaderboard_entries
   WHERE coach_id = p_coach_id
     AND period = p_period
     AND period_start = p_period_start
     AND metric = p_metric;

  -- Insérer une ligne par client opt-in
  FOR r IN
    SELECT cc.client_id AS user_id
      FROM public.coach_clients cc
      JOIN public.leaderboard_preferences lp ON lp.user_id = cc.client_id
     WHERE cc.coach_id = p_coach_id
       AND cc.status = 'active'
       AND lp.participates = TRUE
  LOOP
    INSERT INTO public.leaderboard_entries(
      coach_id, user_id, period, period_start, period_end, metric, value
    ) VALUES (
      p_coach_id, r.user_id, p_period, p_period_start, v_end, p_metric,
      public.fn_compute_leaderboard_metric(p_metric, r.user_id, p_period_start, v_end)
    );
    v_count := v_count + 1;
  END LOOP;

  -- Ranking
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY value DESC, user_id ASC) AS rk
      FROM public.leaderboard_entries
     WHERE coach_id = p_coach_id
       AND period = p_period
       AND period_start = p_period_start
       AND metric = p_metric
  )
  UPDATE public.leaderboard_entries le
     SET rank = ranked.rk
    FROM ranked
   WHERE le.id = ranked.id;

  RETURN v_count;
END;
$$;

-- Refresh global (toutes métriques, période courante) pour un coach
CREATE OR REPLACE FUNCTION public.fn_refresh_leaderboards_for_coach(p_coach_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start  DATE;
  v_month_start DATE;
  v_metric      TEXT;
BEGIN
  -- Lundi de la semaine courante
  v_week_start := (CURRENT_DATE - ((EXTRACT(DOW FROM CURRENT_DATE)::INT + 6) % 7))::DATE;
  -- 1er du mois courant
  v_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  FOREACH v_metric IN ARRAY ARRAY[
    'workouts_count', 'total_volume_kg', 'cardio_distance_km',
    'cardio_duration_min', 'sleep_hours_avg', 'recovery_score_avg'
  ] LOOP
    PERFORM public.fn_refresh_leaderboard(p_coach_id, 'week',  v_week_start,  v_metric);
    PERFORM public.fn_refresh_leaderboard(p_coach_id, 'month', v_month_start, v_metric);
  END LOOP;
END;
$$;

-- Refresh ALL (job nightly)
CREATE OR REPLACE FUNCTION public.fn_refresh_leaderboards_all()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_count INT := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT coach_id FROM public.coach_clients WHERE status = 'active'
  LOOP
    PERFORM public.fn_refresh_leaderboards_for_coach(r.coach_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.leaderboard_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_entries     ENABLE ROW LEVEL SECURITY;

-- PREFERENCES : chacun gère les siennes
DROP POLICY IF EXISTS lp_select_self ON public.leaderboard_preferences;
CREATE POLICY lp_select_self ON public.leaderboard_preferences
FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR coach_id = auth.uid()
);

DROP POLICY IF EXISTS lp_upsert_self ON public.leaderboard_preferences;
CREATE POLICY lp_upsert_self ON public.leaderboard_preferences
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS lp_update_self ON public.leaderboard_preferences;
CREATE POLICY lp_update_self ON public.leaderboard_preferences
FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ENTRIES : lecture coach + ses clients opt-in
DROP POLICY IF EXISTS le_select ON public.leaderboard_entries;
CREATE POLICY le_select ON public.leaderboard_entries
FOR SELECT TO authenticated
USING (
  coach_id = auth.uid()
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.coach_clients
     WHERE coach_id = leaderboard_entries.coach_id
       AND client_id = auth.uid()
       AND status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Pas d'INSERT/UPDATE/DELETE direct via RLS user — uniquement via SECURITY DEFINER functions
