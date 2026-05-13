-- =====================================================================
-- Coach DM · Phase 5 · Migration 022
-- Activity calendar — vue agrégée daily (GitHub-style contributions)
-- =====================================================================
-- Combine workouts + cardio + recovery + nutrition logs en une intensité 0-4
-- =====================================================================

-- ---------------------------------------------------------------------
-- Table cardio_logs (créée si absente — ajoute le support cardio Phase 2+)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cardio_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type   text NOT NULL CHECK (activity_type IN (
    'running','cycling','swimming','rowing','walking','hiking','elliptical','other'
  )),
  started_at      timestamptz NOT NULL DEFAULT now(),
  duration_s      int NOT NULL CHECK (duration_s > 0),
  distance_m      numeric(10,1) CHECK (distance_m IS NULL OR distance_m >= 0),
  avg_hr_bpm      int CHECK (avg_hr_bpm IS NULL OR (avg_hr_bpm > 30 AND avg_hr_bpm < 230)),
  max_hr_bpm      int CHECK (max_hr_bpm IS NULL OR (max_hr_bpm > 30 AND max_hr_bpm < 230)),
  calories_kcal   int CHECK (calories_kcal IS NULL OR calories_kcal >= 0),
  rpe             int CHECK (rpe IS NULL OR (rpe BETWEEN 1 AND 10)),
  source          text NOT NULL DEFAULT 'manual'
                  CHECK (source IN ('manual','healthkit','google_fit','strava','garmin')),
  external_id     text,
  notes           text,
  logged_date     date GENERATED ALWAYS AS ((started_at AT TIME ZONE 'Europe/Brussels')::date) STORED,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cardio_logs_external_unique UNIQUE (user_id, source, external_id)
);

CREATE INDEX IF NOT EXISTS cardio_logs_user_date_idx
  ON public.cardio_logs (user_id, logged_date DESC);

ALTER TABLE public.cardio_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cardio_logs_select_self ON public.cardio_logs;
CREATE POLICY cardio_logs_select_self ON public.cardio_logs
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS cardio_logs_insert_self ON public.cardio_logs;
CREATE POLICY cardio_logs_insert_self ON public.cardio_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS cardio_logs_update_self ON public.cardio_logs;
CREATE POLICY cardio_logs_update_self ON public.cardio_logs
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS cardio_logs_delete_self ON public.cardio_logs;
CREATE POLICY cardio_logs_delete_self ON public.cardio_logs
  FOR DELETE USING (auth.uid() = user_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='coach_clients'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS cardio_logs_select_coach ON public.cardio_logs';
    EXECUTE $P$
      CREATE POLICY cardio_logs_select_coach ON public.cardio_logs
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.coach_clients cc
          WHERE cc.client_id = cardio_logs.user_id
            AND cc.coach_id = auth.uid()
            AND cc.status = 'active'
        )
      )
    $P$;
  END IF;
END$$;

-- ---------------------------------------------------------------------
-- Trigger PR cardio
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_cardio_logs_pr_check()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_pace_s_per_km numeric;
BEGIN
  -- Distance max
  IF NEW.distance_m IS NOT NULL AND NEW.distance_m > 0 THEN
    PERFORM public.try_insert_pr(
      NEW.user_id, 'cardio_distance', NULL, NULL, NEW.activity_type,
      NEW.distance_m, 'm', NEW.id, 'cardio_logs',
      NULL, NULL, NULL, NEW.started_at
    );
  END IF;

  -- Durée max
  PERFORM public.try_insert_pr(
    NEW.user_id, 'cardio_duration', NULL, NULL, NEW.activity_type,
    NEW.duration_s, 's', NEW.id, 'cardio_logs',
    NULL, NULL, NULL, NEW.started_at
  );

  -- Allure (s/km) : seulement pour running/cycling/swimming, distance ≥ 1km
  IF NEW.activity_type IN ('running','cycling','swimming','rowing','walking','hiking')
     AND NEW.distance_m IS NOT NULL AND NEW.distance_m >= 1000 THEN
    v_pace_s_per_km := ROUND((NEW.duration_s::numeric / (NEW.distance_m / 1000))::numeric, 2);
    PERFORM public.try_insert_pr(
      NEW.user_id, 'cardio_pace', NULL, NULL, NEW.activity_type,
      v_pace_s_per_km, 's_per_km', NEW.id, 'cardio_logs',
      NULL, NULL, NULL, NEW.started_at
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cardio_logs_pr_check ON public.cardio_logs;
CREATE TRIGGER cardio_logs_pr_check
  AFTER INSERT ON public.cardio_logs
  FOR EACH ROW EXECUTE FUNCTION public.tg_cardio_logs_pr_check();

-- ---------------------------------------------------------------------
-- Vue : daily_activity (GitHub-style 0-4)
-- ---------------------------------------------------------------------
-- Score d'intensité par jour :
--   0 = rien
--   1 = activité légère (1 habit OU 1 hydra OK)
--   2 = activité modérée (workout court OU cardio < 30min)
--   3 = activité forte (workout complet ET/OU cardio long)
--   4 = jour intense (workout + cardio + recovery score haut)
-- ---------------------------------------------------------------------
-- Création conditionnelle : utilise les tables Phase 4 si présentes,
-- sinon dégrade vers workout + cardio uniquement
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_has_habit  boolean;
  v_has_hydra  boolean;
  v_has_wlogs  boolean;
  v_sql        text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='habit_logs'
  ) INTO v_has_habit;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='hydration_entries'
  ) INTO v_has_hydra;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='workout_logs'
  ) INTO v_has_wlogs;

  -- Construction dynamique de la vue
  v_sql := $V$
  CREATE OR REPLACE VIEW public.daily_activity AS
  WITH
  $V$;

  IF v_has_wlogs THEN
    v_sql := v_sql || $V$
    workouts_per_day AS (
      SELECT
        user_id,
        (started_at AT TIME ZONE 'Europe/Brussels')::date AS day,
        COUNT(*) AS workout_count,
        COALESCE(SUM(duration_min), 0) AS workout_minutes
      FROM public.workout_logs
      WHERE started_at >= CURRENT_DATE - INTERVAL '400 days'
      GROUP BY user_id, day
    ),
    $V$;
  ELSE
    v_sql := v_sql || $V$
    workouts_per_day AS (
      SELECT NULL::uuid AS user_id, NULL::date AS day, 0 AS workout_count, 0 AS workout_minutes
      WHERE false
    ),
    $V$;
  END IF;

  v_sql := v_sql || $V$
  cardio_per_day AS (
    SELECT
      user_id,
      logged_date AS day,
      COUNT(*) AS cardio_count,
      COALESCE(SUM(duration_s) / 60, 0)::int AS cardio_minutes
    FROM public.cardio_logs
    WHERE logged_date >= CURRENT_DATE - INTERVAL '400 days'
    GROUP BY user_id, day
  ),
  $V$;

  IF v_has_habit THEN
    v_sql := v_sql || $V$
    habits_per_day AS (
      SELECT
        user_id,
        logged_date AS day,
        COUNT(*) FILTER (WHERE completed) AS habits_done
      FROM public.habit_logs
      WHERE logged_date >= CURRENT_DATE - INTERVAL '400 days'
      GROUP BY user_id, day
    ),
    $V$;
  ELSE
    v_sql := v_sql || $V$
    habits_per_day AS (
      SELECT NULL::uuid AS user_id, NULL::date AS day, 0 AS habits_done
      WHERE false
    ),
    $V$;
  END IF;

  IF v_has_hydra THEN
    v_sql := v_sql || $V$
    hydra_per_day AS (
      SELECT
        user_id,
        logged_date AS day,
        SUM(amount_ml) AS hydra_ml
      FROM public.hydration_entries
      WHERE logged_date >= CURRENT_DATE - INTERVAL '400 days'
      GROUP BY user_id, day
    ),
    $V$;
  ELSE
    v_sql := v_sql || $V$
    hydra_per_day AS (
      SELECT NULL::uuid AS user_id, NULL::date AS day, 0::numeric AS hydra_ml
      WHERE false
    ),
    $V$;
  END IF;

  v_sql := v_sql || $V$
  combined AS (
    SELECT
      COALESCE(w.user_id, c.user_id, h.user_id, hy.user_id) AS user_id,
      COALESCE(w.day, c.day, h.day, hy.day) AS day,
      COALESCE(w.workout_count, 0)   AS workout_count,
      COALESCE(w.workout_minutes, 0) AS workout_minutes,
      COALESCE(c.cardio_count, 0)    AS cardio_count,
      COALESCE(c.cardio_minutes, 0)  AS cardio_minutes,
      COALESCE(h.habits_done, 0)     AS habits_done,
      COALESCE(hy.hydra_ml, 0)       AS hydra_ml
    FROM workouts_per_day w
    FULL OUTER JOIN cardio_per_day c USING (user_id, day)
    FULL OUTER JOIN habits_per_day h USING (user_id, day)
    FULL OUTER JOIN hydra_per_day  hy USING (user_id, day)
  )
  SELECT
    user_id,
    day,
    workout_count,
    workout_minutes,
    cardio_count,
    cardio_minutes,
    habits_done,
    hydra_ml,
    CASE
      WHEN workout_count >= 1 AND cardio_count >= 1 AND (habits_done + (hydra_ml >= 2000)::int) >= 2 THEN 4
      WHEN workout_minutes >= 45 OR cardio_minutes >= 45 OR (workout_count >= 1 AND cardio_count >= 1) THEN 3
      WHEN workout_count >= 1 OR cardio_count >= 1 THEN 2
      WHEN habits_done >= 1 OR hydra_ml >= 1000 THEN 1
      ELSE 0
    END AS intensity
  FROM combined
  WHERE user_id IS NOT NULL AND day IS NOT NULL
  $V$;

  EXECUTE v_sql;
END$$;

COMMENT ON VIEW public.daily_activity IS
  'Coach DM Phase 5 — Daily activity intensity 0-4 for GitHub-style calendar.';
