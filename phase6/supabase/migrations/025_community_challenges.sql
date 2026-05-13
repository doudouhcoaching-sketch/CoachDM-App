-- ============================================================
-- Coach DM · Phase 6 · Migration 025
-- Challenges (weekly / monthly / custom)
-- ============================================================
-- 8 types de challenges trackés automatiquement depuis Phase 2/4/5 :
--  workouts_count, total_volume_kg, cardio_distance_km,
--  cardio_duration_min, sleep_hours_avg, hydration_days_target,
--  habit_streak_days, pr_count
-- + 1 type manuel : custom_metric (saisie déclarative)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.community_challenges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title_fr        TEXT NOT NULL,
  title_en        TEXT NOT NULL,
  title_nl        TEXT NOT NULL,
  description_fr  TEXT,
  description_en  TEXT,
  description_nl  TEXT,
  metric          TEXT NOT NULL CHECK (metric IN (
                    'workouts_count',
                    'total_volume_kg',
                    'cardio_distance_km',
                    'cardio_duration_min',
                    'sleep_hours_avg',
                    'hydration_days_target',
                    'habit_streak_days',
                    'pr_count',
                    'custom_metric'
                  )),
  target_value    NUMERIC NOT NULL CHECK (target_value > 0),
  unit            TEXT,                       -- ex : 'sessions', 'kg', 'km', 'min', 'h', 'jours'
  starts_at       DATE NOT NULL,
  ends_at         DATE NOT NULL,
  visibility      TEXT NOT NULL DEFAULT 'coach' CHECK (visibility IN (
                    'coach',   -- tous les clients du coach voient
                    'private'  -- liste explicite de participants
                  )),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
                    'draft', 'active', 'completed', 'cancelled'
                  )),
  cover_image_url TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS idx_challenges_coach_active
  ON public.community_challenges(coach_id, status, ends_at DESC);

-- ---------- PARTICIPATIONS ----------
CREATE TABLE IF NOT EXISTS public.community_challenge_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id    UUID NOT NULL REFERENCES public.community_challenges(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_value   NUMERIC NOT NULL DEFAULT 0,
  progress_pct    NUMERIC NOT NULL DEFAULT 0,
  completed_at    TIMESTAMPTZ,
  rank            INT,
  last_recomputed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge
  ON public.community_challenge_participants(challenge_id, current_value DESC);

CREATE INDEX IF NOT EXISTS idx_challenge_participants_user
  ON public.community_challenge_participants(user_id);

-- ---------- CUSTOM METRIC ENTRIES ----------
-- Pour challenges custom_metric, les users postent leur valeur quotidienne
CREATE TABLE IF NOT EXISTS public.community_challenge_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id  UUID NOT NULL REFERENCES public.community_challenges(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  value         NUMERIC NOT NULL,
  note          TEXT,
  proof_image_url TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(challenge_id, user_id, entry_date)
);

CREATE INDEX IF NOT EXISTS idx_challenge_entries_user_chall
  ON public.community_challenge_entries(user_id, challenge_id, entry_date DESC);

-- ============================================================
-- FONCTIONS DE CALCUL DE PROGRESSION
-- ============================================================

-- Fonction sécurisée : calcule la valeur d'un user pour un challenge.
-- Conditionnelle aux tables existantes (tolère absence Phase 2/4/5).
CREATE OR REPLACE FUNCTION public.fn_compute_challenge_value(
  p_challenge_id UUID,
  p_user_id      UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metric    TEXT;
  v_start     DATE;
  v_end       DATE;
  v_value     NUMERIC := 0;
  v_has_table BOOLEAN;
BEGIN
  SELECT metric, starts_at, ends_at
    INTO v_metric, v_start, v_end
    FROM public.community_challenges
   WHERE id = p_challenge_id;

  IF v_metric IS NULL THEN
    RETURN 0;
  END IF;

  -- workouts_count → workout_logs (Phase 2)
  IF v_metric = 'workouts_count' THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'workout_logs'
    ) INTO v_has_table;
    IF v_has_table THEN
      EXECUTE format($q$
        SELECT COUNT(*)::NUMERIC
          FROM public.workout_logs
         WHERE user_id = %L
           AND started_at::DATE BETWEEN %L AND %L
      $q$, p_user_id, v_start, v_end) INTO v_value;
    END IF;

  -- total_volume_kg → workout_sets (Phase 2)
  ELSIF v_metric = 'total_volume_kg' THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'workout_sets'
    ) INTO v_has_table;
    IF v_has_table THEN
      EXECUTE format($q$
        SELECT COALESCE(SUM(ws.weight_kg * ws.reps), 0)::NUMERIC
          FROM public.workout_sets ws
          JOIN public.workout_logs wl ON wl.id = ws.workout_log_id
         WHERE wl.user_id = %L
           AND wl.started_at::DATE BETWEEN %L AND %L
      $q$, p_user_id, v_start, v_end) INTO v_value;
    END IF;

  -- cardio_distance_km → cardio_logs (Phase 5)
  ELSIF v_metric = 'cardio_distance_km' THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'cardio_logs'
    ) INTO v_has_table;
    IF v_has_table THEN
      EXECUTE format($q$
        SELECT COALESCE(SUM(distance_km), 0)::NUMERIC
          FROM public.cardio_logs
         WHERE user_id = %L
           AND performed_at::DATE BETWEEN %L AND %L
      $q$, p_user_id, v_start, v_end) INTO v_value;
    END IF;

  -- cardio_duration_min → cardio_logs (Phase 5)
  ELSIF v_metric = 'cardio_duration_min' THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'cardio_logs'
    ) INTO v_has_table;
    IF v_has_table THEN
      EXECUTE format($q$
        SELECT COALESCE(SUM(duration_min), 0)::NUMERIC
          FROM public.cardio_logs
         WHERE user_id = %L
           AND performed_at::DATE BETWEEN %L AND %L
      $q$, p_user_id, v_start, v_end) INTO v_value;
    END IF;

  -- sleep_hours_avg → sleep_sessions (Phase 4)
  ELSIF v_metric = 'sleep_hours_avg' THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'sleep_sessions'
    ) INTO v_has_table;
    IF v_has_table THEN
      EXECUTE format($q$
        SELECT COALESCE(AVG(duration_min) / 60.0, 0)::NUMERIC
          FROM public.sleep_sessions
         WHERE user_id = %L
           AND sleep_date BETWEEN %L AND %L
      $q$, p_user_id, v_start, v_end) INTO v_value;
    END IF;

  -- hydration_days_target → vue hydration_daily (Phase 4)
  ELSIF v_metric = 'hydration_days_target' THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.views
       WHERE table_schema = 'public' AND table_name = 'hydration_daily'
    ) INTO v_has_table;
    IF v_has_table THEN
      EXECUTE format($q$
        SELECT COUNT(*)::NUMERIC
          FROM public.hydration_daily
         WHERE user_id = %L
           AND day BETWEEN %L AND %L
           AND total_ml >= target_ml
      $q$, p_user_id, v_start, v_end) INTO v_value;
    END IF;

  -- habit_streak_days → habit_logs (Phase 4)
  ELSIF v_metric = 'habit_streak_days' THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'habit_logs'
    ) INTO v_has_table;
    IF v_has_table THEN
      EXECUTE format($q$
        SELECT COUNT(DISTINCT log_date)::NUMERIC
          FROM public.habit_logs
         WHERE user_id = %L
           AND log_date BETWEEN %L AND %L
           AND completed = TRUE
      $q$, p_user_id, v_start, v_end) INTO v_value;
    END IF;

  -- pr_count → personal_records (Phase 5)
  ELSIF v_metric = 'pr_count' THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'personal_records'
    ) INTO v_has_table;
    IF v_has_table THEN
      EXECUTE format($q$
        SELECT COUNT(*)::NUMERIC
          FROM public.personal_records
         WHERE user_id = %L
           AND achieved_at::DATE BETWEEN %L AND %L
      $q$, p_user_id, v_start, v_end) INTO v_value;
    END IF;

  -- custom_metric → community_challenge_entries (toujours dispo)
  ELSIF v_metric = 'custom_metric' THEN
    SELECT COALESCE(SUM(value), 0)::NUMERIC
      INTO v_value
      FROM public.community_challenge_entries
     WHERE challenge_id = p_challenge_id
       AND user_id = p_user_id
       AND entry_date BETWEEN v_start AND v_end;
  END IF;

  RETURN COALESCE(v_value, 0);
END;
$$;

-- Fonction : recompute progression d'un participant
CREATE OR REPLACE FUNCTION public.fn_recompute_challenge_participant(
  p_challenge_id UUID,
  p_user_id      UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target NUMERIC;
  v_value  NUMERIC;
  v_pct    NUMERIC;
  v_done   TIMESTAMPTZ;
BEGIN
  SELECT target_value INTO v_target
    FROM public.community_challenges
   WHERE id = p_challenge_id;

  IF v_target IS NULL THEN RETURN; END IF;

  v_value := public.fn_compute_challenge_value(p_challenge_id, p_user_id);
  v_pct   := LEAST(100, ROUND((v_value / v_target) * 100, 1));

  SELECT completed_at INTO v_done
    FROM public.community_challenge_participants
   WHERE challenge_id = p_challenge_id AND user_id = p_user_id;

  IF v_done IS NULL AND v_value >= v_target THEN
    v_done := NOW();
  END IF;

  UPDATE public.community_challenge_participants
     SET current_value      = v_value,
         progress_pct       = v_pct,
         completed_at       = v_done,
         last_recomputed_at = NOW()
   WHERE challenge_id = p_challenge_id AND user_id = p_user_id;
END;
$$;

-- Fonction : recompute tous les participants d'un challenge + ranking
CREATE OR REPLACE FUNCTION public.fn_recompute_challenge_all(
  p_challenge_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT user_id FROM public.community_challenge_participants
     WHERE challenge_id = p_challenge_id
  LOOP
    PERFORM public.fn_recompute_challenge_participant(p_challenge_id, r.user_id);
    v_count := v_count + 1;
  END LOOP;

  -- Ranking
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (ORDER BY current_value DESC, joined_at ASC) AS rk
      FROM public.community_challenge_participants
     WHERE challenge_id = p_challenge_id
  )
  UPDATE public.community_challenge_participants p
     SET rank = ranked.rk
    FROM ranked
   WHERE p.id = ranked.id;

  RETURN v_count;
END;
$$;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.community_challenges              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_challenge_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_challenge_entries       ENABLE ROW LEVEL SECURITY;

-- CHALLENGES : lecture (coach + ses clients)
DROP POLICY IF EXISTS challenges_select ON public.community_challenges;
CREATE POLICY challenges_select ON public.community_challenges
FOR SELECT TO authenticated
USING (
  coach_id = auth.uid()
  OR (
    visibility = 'coach'
    AND EXISTS (
      SELECT 1 FROM public.coach_clients
       WHERE coach_id = community_challenges.coach_id
         AND client_id = auth.uid()
         AND status = 'active'
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.community_challenge_participants
     WHERE challenge_id = community_challenges.id
       AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- CHALLENGES : insert (coach uniquement)
DROP POLICY IF EXISTS challenges_insert ON public.community_challenges;
CREATE POLICY challenges_insert ON public.community_challenges
FOR INSERT TO authenticated
WITH CHECK (
  coach_id = auth.uid() AND created_by = auth.uid()
);

-- CHALLENGES : update/delete coach
DROP POLICY IF EXISTS challenges_update ON public.community_challenges;
CREATE POLICY challenges_update ON public.community_challenges
FOR UPDATE TO authenticated
USING (coach_id = auth.uid());

DROP POLICY IF EXISTS challenges_delete ON public.community_challenges;
CREATE POLICY challenges_delete ON public.community_challenges
FOR DELETE TO authenticated
USING (coach_id = auth.uid());

-- PARTICIPANTS : lecture (tous ceux qui voient le challenge)
DROP POLICY IF EXISTS participants_select ON public.community_challenge_participants;
CREATE POLICY participants_select ON public.community_challenge_participants
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.community_challenges c
     WHERE c.id = community_challenge_participants.challenge_id
       AND (
         c.coach_id = auth.uid()
         OR EXISTS (
           SELECT 1 FROM public.coach_clients
            WHERE coach_id = c.coach_id AND client_id = auth.uid() AND status = 'active'
         )
         OR community_challenge_participants.user_id = auth.uid()
       )
  )
);

-- PARTICIPANTS : insert (self ou coach pour ses clients)
DROP POLICY IF EXISTS participants_insert ON public.community_challenge_participants;
CREATE POLICY participants_insert ON public.community_challenge_participants
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.community_challenges c
     WHERE c.id = challenge_id AND c.coach_id = auth.uid()
  )
);

DROP POLICY IF EXISTS participants_delete ON public.community_challenge_participants;
CREATE POLICY participants_delete ON public.community_challenge_participants
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.community_challenges c
     WHERE c.id = challenge_id AND c.coach_id = auth.uid()
  )
);

-- ENTRIES (custom)
DROP POLICY IF EXISTS entries_select ON public.community_challenge_entries;
CREATE POLICY entries_select ON public.community_challenge_entries
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.community_challenges c
     WHERE c.id = community_challenge_entries.challenge_id
       AND (
         c.coach_id = auth.uid()
         OR EXISTS (
           SELECT 1 FROM public.coach_clients
            WHERE coach_id = c.coach_id AND client_id = auth.uid() AND status = 'active'
         )
       )
  )
);

DROP POLICY IF EXISTS entries_insert ON public.community_challenge_entries;
CREATE POLICY entries_insert ON public.community_challenge_entries
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS entries_update ON public.community_challenge_entries;
CREATE POLICY entries_update ON public.community_challenge_entries
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS entries_delete ON public.community_challenge_entries;
CREATE POLICY entries_delete ON public.community_challenge_entries
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Trigger : recompute participant après nouvelle entry custom
CREATE OR REPLACE FUNCTION public.fn_challenge_entry_recompute()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.fn_recompute_challenge_participant(
    COALESCE(NEW.challenge_id, OLD.challenge_id),
    COALESCE(NEW.user_id, OLD.user_id)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_challenge_entry_recompute ON public.community_challenge_entries;
CREATE TRIGGER trg_challenge_entry_recompute
AFTER INSERT OR UPDATE OR DELETE ON public.community_challenge_entries
FOR EACH ROW EXECUTE FUNCTION public.fn_challenge_entry_recompute();

ALTER PUBLICATION supabase_realtime ADD TABLE public.community_challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_challenge_participants;
