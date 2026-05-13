-- =====================================================================
-- Coach DM · Phase 5 · Migration 021
-- Personal Records (PR) — auto-detection
-- Catégories : charges (1RM/volume), cardio (distance/temps/FC), body
-- =====================================================================
-- Sources scientifiques :
-- - Epley B. (1985). Boyd Epley Workout. — formule 1RM la plus utilisée
-- - Brzycki M. (1993). Strength testing — predicting a one-rep max from
--   reps-to-fatigue. JOPERD 64(1):88-90.
-- - Helms et al. 2018 (RPE-based load prescription)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Table principale des PRs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.personal_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Catégorie de PR
  category        text NOT NULL CHECK (category IN (
    'strength_1rm',     -- 1RM estimé (Epley/Brzycki) ou réel
    'strength_volume',  -- volume max sur une session pour un exo
    'cardio_distance',  -- distance max pour un type d'activité
    'cardio_duration',  -- durée max
    'cardio_pace',      -- meilleure allure (s/km)
    'cardio_hr_avg',    -- FC moyenne la plus basse à effort donné
    'body_weight_min',  -- poids minimum atteint (cut)
    'body_weight_max',  -- poids maximum atteint (bulk)
    'body_fat_min'      -- body fat minimum
  )),

  -- Référence (exercise_id pour strength, activity_type pour cardio, NULL pour body)
  exercise_id     uuid,           -- FK soft vers exercises (Phase 2)
  exercise_name   text,           -- snapshot pour résilience
  activity_type   text,           -- 'running','cycling','swimming','rowing'

  -- Valeur du record (toutes catégories convergent vers numeric)
  value           numeric(10,3) NOT NULL,
  unit            text NOT NULL,  -- 'kg','reps','m','s','%','bpm','s_per_km'

  -- Contexte
  achieved_at     timestamptz NOT NULL DEFAULT now(),
  achieved_date   date GENERATED ALWAYS AS ((achieved_at AT TIME ZONE 'Europe/Brussels')::date) STORED,
  source_log_id   uuid,           -- workout_log ou cardio_log d'origine
  source_table    text CHECK (source_table IN ('workout_logs','cardio_logs','body_metrics')),

  -- Méthode de calcul (pour 1RM estimé)
  calc_method     text CHECK (calc_method IS NULL OR calc_method IN ('actual','epley','brzycki')),
  reps            int CHECK (reps IS NULL OR (reps > 0 AND reps < 50)),
  load_kg         numeric(6,2),

  -- Delta vs précédent record (pour notif)
  previous_value  numeric(10,3),
  delta_pct       numeric(5,2),

  created_at      timestamptz NOT NULL DEFAULT now(),

  -- Un PR par couple (user, category, exercise/activity) — superposable dans le temps via achieved_at
  -- On garde l'historique : la "current" est dérivée par MAX/MIN
  CONSTRAINT pr_value_positive CHECK (value > 0)
);

CREATE INDEX IF NOT EXISTS pr_user_category_idx
  ON public.personal_records (user_id, category, achieved_at DESC);
CREATE INDEX IF NOT EXISTS pr_user_exercise_idx
  ON public.personal_records (user_id, exercise_id, achieved_at DESC)
  WHERE exercise_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS pr_user_activity_idx
  ON public.personal_records (user_id, activity_type, achieved_at DESC)
  WHERE activity_type IS NOT NULL;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pr_select_self ON public.personal_records;
CREATE POLICY pr_select_self ON public.personal_records
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS pr_insert_self ON public.personal_records;
CREATE POLICY pr_insert_self ON public.personal_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='coach_clients'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS pr_select_coach ON public.personal_records';
    EXECUTE $P$
      CREATE POLICY pr_select_coach ON public.personal_records
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.coach_clients cc
          WHERE cc.client_id = personal_records.user_id
            AND cc.coach_id = auth.uid()
            AND cc.status = 'active'
        )
      )
    $P$;
  END IF;
END$$;

-- ---------------------------------------------------------------------
-- Fonctions de calcul 1RM
-- ---------------------------------------------------------------------
-- Epley : 1RM = w × (1 + reps/30)
CREATE OR REPLACE FUNCTION public.estimate_1rm_epley(load_kg numeric, reps int)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN reps IS NULL OR reps <= 0 OR load_kg IS NULL THEN NULL
    WHEN reps = 1 THEN load_kg
    ELSE ROUND((load_kg * (1 + reps::numeric / 30))::numeric, 2)
  END;
$$;

-- Brzycki : 1RM = w × 36 / (37 - reps), valide pour reps ≤ 10
CREATE OR REPLACE FUNCTION public.estimate_1rm_brzycki(load_kg numeric, reps int)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN reps IS NULL OR reps <= 0 OR reps > 36 OR load_kg IS NULL THEN NULL
    WHEN reps = 1 THEN load_kg
    ELSE ROUND((load_kg * 36.0 / (37 - reps))::numeric, 2)
  END;
$$;

-- ---------------------------------------------------------------------
-- Fonction : insérer un PR si supérieur au record courant
-- Retourne true si nouveau record détecté
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.try_insert_pr(
  p_user_id        uuid,
  p_category       text,
  p_exercise_id    uuid,
  p_exercise_name  text,
  p_activity_type  text,
  p_value          numeric,
  p_unit           text,
  p_source_log_id  uuid,
  p_source_table   text,
  p_calc_method    text,
  p_reps           int,
  p_load_kg        numeric,
  p_achieved_at    timestamptz
) RETURNS boolean
LANGUAGE plpgsql AS $$
DECLARE
  v_current numeric;
  v_better  boolean := false;
  v_delta   numeric;
BEGIN
  -- Détermine le record courant selon la catégorie
  IF p_category IN ('body_weight_min','body_fat_min','cardio_pace') THEN
    -- Catégories où "plus petit = mieux"
    SELECT MIN(value) INTO v_current
    FROM public.personal_records
    WHERE user_id = p_user_id
      AND category = p_category
      AND COALESCE(exercise_id::text, '') = COALESCE(p_exercise_id::text, '')
      AND COALESCE(activity_type, '') = COALESCE(p_activity_type, '');
    v_better := v_current IS NULL OR p_value < v_current;
  ELSE
    -- Catégories où "plus grand = mieux"
    SELECT MAX(value) INTO v_current
    FROM public.personal_records
    WHERE user_id = p_user_id
      AND category = p_category
      AND COALESCE(exercise_id::text, '') = COALESCE(p_exercise_id::text, '')
      AND COALESCE(activity_type, '') = COALESCE(p_activity_type, '');
    v_better := v_current IS NULL OR p_value > v_current;
  END IF;

  IF NOT v_better THEN
    RETURN false;
  END IF;

  -- Calcul delta %
  IF v_current IS NOT NULL AND v_current > 0 THEN
    v_delta := ROUND(((p_value - v_current) / v_current * 100)::numeric, 2);
  END IF;

  INSERT INTO public.personal_records (
    user_id, category, exercise_id, exercise_name, activity_type,
    value, unit, source_log_id, source_table,
    calc_method, reps, load_kg,
    previous_value, delta_pct, achieved_at
  ) VALUES (
    p_user_id, p_category, p_exercise_id, p_exercise_name, p_activity_type,
    p_value, p_unit, p_source_log_id, p_source_table,
    p_calc_method, p_reps, p_load_kg,
    v_current, v_delta, COALESCE(p_achieved_at, now())
  );

  RETURN true;
END;
$$;

-- ---------------------------------------------------------------------
-- Trigger : à chaque workout_set inséré, tenter de créer des PRs
-- (suppose la table workout_sets de Phase 2 avec colonnes
--  workout_log_id, exercise_id, load_kg, reps, set_index)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_workout_sets_pr_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id      uuid;
  v_ex_name      text;
  v_achieved_at  timestamptz;
  v_session_vol  numeric;
  v_1rm_epley    numeric;
  v_1rm_brzycki  numeric;
  v_1rm_best     numeric;
  v_method       text;
BEGIN
  IF NEW.load_kg IS NULL OR NEW.reps IS NULL OR NEW.reps <= 0 THEN
    RETURN NEW;
  END IF;

  -- Lookup user_id et exercise_name via workout_log (souple : si table absente, abandon silencieux)
  BEGIN
    SELECT wl.user_id, wl.completed_at, e.name
      INTO v_user_id, v_achieved_at, v_ex_name
    FROM public.workout_logs wl
    LEFT JOIN public.exercises e ON e.id = NEW.exercise_id
    WHERE wl.id = NEW.workout_log_id;
  EXCEPTION WHEN undefined_table THEN
    RETURN NEW;
  END;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 1RM estimé : on prend la formule la plus généreuse selon les reps
  -- Brzycki est plus fiable ≤ 10 reps, Epley ≥ 10 reps (Mayhew 1992 review)
  v_1rm_epley   := public.estimate_1rm_epley(NEW.load_kg, NEW.reps);
  v_1rm_brzycki := public.estimate_1rm_brzycki(NEW.load_kg, NEW.reps);

  IF NEW.reps <= 10 THEN
    v_1rm_best := v_1rm_brzycki;
    v_method   := 'brzycki';
  ELSE
    v_1rm_best := v_1rm_epley;
    v_method   := 'epley';
  END IF;

  IF NEW.reps = 1 THEN
    v_method := 'actual';
  END IF;

  IF v_1rm_best IS NOT NULL THEN
    PERFORM public.try_insert_pr(
      v_user_id, 'strength_1rm', NEW.exercise_id, v_ex_name, NULL,
      v_1rm_best, 'kg', NEW.workout_log_id, 'workout_logs',
      v_method, NEW.reps, NEW.load_kg, v_achieved_at
    );
  END IF;

  -- Volume de la session pour cet exercice (sum load × reps)
  SELECT SUM(s.load_kg * s.reps) INTO v_session_vol
  FROM public.workout_sets s
  WHERE s.workout_log_id = NEW.workout_log_id
    AND s.exercise_id = NEW.exercise_id
    AND s.load_kg IS NOT NULL AND s.reps IS NOT NULL;

  IF v_session_vol IS NOT NULL THEN
    PERFORM public.try_insert_pr(
      v_user_id, 'strength_volume', NEW.exercise_id, v_ex_name, NULL,
      v_session_vol, 'kg', NEW.workout_log_id, 'workout_logs',
      NULL, NULL, NULL, v_achieved_at
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger conditionnel : créé seulement si workout_sets existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'workout_sets'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS workout_sets_pr_check ON public.workout_sets';
    EXECUTE 'CREATE TRIGGER workout_sets_pr_check
             AFTER INSERT ON public.workout_sets
             FOR EACH ROW EXECUTE FUNCTION public.tg_workout_sets_pr_check()';
  END IF;
END$$;

-- ---------------------------------------------------------------------
-- Trigger : body_metrics → PRs body
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_body_metrics_pr_check()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.weight_kg IS NOT NULL THEN
    PERFORM public.try_insert_pr(
      NEW.user_id, 'body_weight_min', NULL, NULL, NULL,
      NEW.weight_kg, 'kg', NEW.id, 'body_metrics',
      NULL, NULL, NULL, NEW.measured_at
    );
    PERFORM public.try_insert_pr(
      NEW.user_id, 'body_weight_max', NULL, NULL, NULL,
      NEW.weight_kg, 'kg', NEW.id, 'body_metrics',
      NULL, NULL, NULL, NEW.measured_at
    );
  END IF;

  IF NEW.body_fat_pct IS NOT NULL THEN
    PERFORM public.try_insert_pr(
      NEW.user_id, 'body_fat_min', NULL, NULL, NULL,
      NEW.body_fat_pct, '%', NEW.id, 'body_metrics',
      NULL, NULL, NULL, NEW.measured_at
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS body_metrics_pr_check ON public.body_metrics;
CREATE TRIGGER body_metrics_pr_check
  AFTER INSERT ON public.body_metrics
  FOR EACH ROW EXECUTE FUNCTION public.tg_body_metrics_pr_check();

-- ---------------------------------------------------------------------
-- Vue : PRs courants (le meilleur de chaque catégorie/exercice)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.current_prs AS
SELECT DISTINCT ON (user_id, category, COALESCE(exercise_id::text,''), COALESCE(activity_type,''))
  user_id, category, exercise_id, exercise_name, activity_type,
  value, unit, achieved_at, achieved_date,
  calc_method, reps, load_kg, previous_value, delta_pct
FROM public.personal_records
ORDER BY
  user_id,
  category,
  COALESCE(exercise_id::text,''),
  COALESCE(activity_type,''),
  CASE WHEN category IN ('body_weight_min','body_fat_min','cardio_pace')
       THEN value ELSE -value END,
  achieved_at DESC;

COMMENT ON TABLE public.personal_records IS
  'Coach DM Phase 5 — PRs auto-détectés. Epley 1985, Brzycki 1993.';
