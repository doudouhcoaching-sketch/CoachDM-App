-- ═══════════════════════════════════════════════════════════════════════════
-- COACH DM · Phase 4 · Migration 019 — Streaks, gamification & pg_cron
-- ═══════════════════════════════════════════════════════════════════════════
-- Calcul automatique des streaks (sommeil, hydratation, habits)
-- Badges légers (milestones)
-- Rappels via pg_cron + Edge Function 'recovery-reminders'
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Streaks (1 ligne par user, mis à jour à chaque log)
CREATE TABLE IF NOT EXISTS recovery_streaks (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Sommeil : nuits consécutives avec ≥7h
  sleep_current     INT NOT NULL DEFAULT 0,
  sleep_best        INT NOT NULL DEFAULT 0,
  sleep_last_date   DATE,

  -- Hydratation : jours consécutifs avec total ≥ target
  hydration_current INT NOT NULL DEFAULT 0,
  hydration_best    INT NOT NULL DEFAULT 0,
  hydration_last_date DATE,

  -- Habits : jours consécutifs avec ≥1 habit complétée
  habits_current    INT NOT NULL DEFAULT 0,
  habits_best       INT NOT NULL DEFAULT 0,
  habits_last_date  DATE,

  -- Score global Recovery (0-100, recalculé sur 7 derniers jours)
  recovery_score    SMALLINT CHECK (recovery_score BETWEEN 0 AND 100),
  score_updated_at  TIMESTAMPTZ,

  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Badges débloqués
CREATE TYPE badge_kind AS ENUM (
  'sleep_7d', 'sleep_30d', 'sleep_100d',
  'hydration_7d', 'hydration_30d', 'hydration_100d',
  'habits_7d', 'habits_30d', 'habits_100d',
  'recovery_score_80', 'recovery_score_95',
  'first_week_complete'
);

CREATE TABLE IF NOT EXISTS recovery_badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind        badge_kind NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT badge_unique_per_user UNIQUE (user_id, kind)
);

CREATE INDEX idx_badges_user ON recovery_badges (user_id, unlocked_at DESC);

-- RLS
ALTER TABLE recovery_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY streaks_owner ON recovery_streaks
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY streaks_coach_read ON recovery_streaks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_clients cc
      WHERE cc.client_id = recovery_streaks.user_id
        AND cc.coach_id = auth.uid()
        AND cc.status = 'active'
    )
  );

CREATE POLICY streaks_admin ON recovery_streaks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY badges_owner ON recovery_badges
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY badges_coach_read ON recovery_badges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_clients cc
      WHERE cc.client_id = recovery_badges.user_id
        AND cc.coach_id = auth.uid()
        AND cc.status = 'active'
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 3) Fonctions de calcul des streaks
-- ═══════════════════════════════════════════════════════════════════════════

-- Init de la ligne streaks pour un nouvel user
CREATE OR REPLACE FUNCTION fn_init_recovery_streaks()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO recovery_streaks (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS init_streaks_on_profile ON profiles;
CREATE TRIGGER init_streaks_on_profile
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION fn_init_recovery_streaks();

-- Mise à jour streak sommeil après insert/update sleep_session
CREATE OR REPLACE FUNCTION fn_update_sleep_streak()
RETURNS TRIGGER AS $$
DECLARE
  v_yesterday DATE;
  v_current   INT;
  v_best      INT;
  v_last_date DATE;
BEGIN
  -- Seuil de qualité du sommeil pour compter dans le streak : 7h = 420 min
  IF NEW.duration_min < 420 THEN
    RETURN NEW;
  END IF;

  SELECT sleep_current, sleep_best, sleep_last_date
    INTO v_current, v_best, v_last_date
    FROM recovery_streaks WHERE user_id = NEW.user_id;

  v_yesterday := NEW.sleep_date - INTERVAL '1 day';

  IF v_last_date IS NULL THEN
    v_current := 1;
  ELSIF v_last_date = NEW.sleep_date THEN
    -- Même jour : on ne change pas le compteur
    RETURN NEW;
  ELSIF v_last_date = v_yesterday THEN
    v_current := v_current + 1;
  ELSE
    v_current := 1;
  END IF;

  v_best := GREATEST(v_best, v_current);

  UPDATE recovery_streaks
    SET sleep_current = v_current,
        sleep_best = v_best,
        sleep_last_date = NEW.sleep_date,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;

  -- Badges
  PERFORM fn_check_streak_badges(NEW.user_id, 'sleep', v_current);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_sleep_streak
  AFTER INSERT OR UPDATE ON sleep_sessions
  FOR EACH ROW EXECUTE FUNCTION fn_update_sleep_streak();

-- Mise à jour streak hydratation (déclenché à chaque entrée — recalcule le jour courant)
CREATE OR REPLACE FUNCTION fn_update_hydration_streak()
RETURNS TRIGGER AS $$
DECLARE
  v_target    INT;
  v_total     INT;
  v_yesterday DATE;
  v_current   INT;
  v_best      INT;
  v_last_date DATE;
BEGIN
  SELECT target_ml INTO v_target FROM hydration_targets WHERE user_id = NEW.user_id;
  IF v_target IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(SUM(amount_ml), 0)::INT INTO v_total
    FROM hydration_entries
    WHERE user_id = NEW.user_id AND drank_date = NEW.drank_date;

  -- Seuil non atteint → on ne touche pas
  IF v_total < v_target THEN RETURN NEW; END IF;

  SELECT hydration_current, hydration_best, hydration_last_date
    INTO v_current, v_best, v_last_date
    FROM recovery_streaks WHERE user_id = NEW.user_id;

  -- Déjà compté ce jour
  IF v_last_date = NEW.drank_date THEN RETURN NEW; END IF;

  v_yesterday := NEW.drank_date - INTERVAL '1 day';

  IF v_last_date IS NULL OR v_last_date < v_yesterday THEN
    v_current := 1;
  ELSIF v_last_date = v_yesterday THEN
    v_current := v_current + 1;
  END IF;

  v_best := GREATEST(v_best, v_current);

  UPDATE recovery_streaks
    SET hydration_current = v_current,
        hydration_best = v_best,
        hydration_last_date = NEW.drank_date,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;

  PERFORM fn_check_streak_badges(NEW.user_id, 'hydration', v_current);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_hydration_streak
  AFTER INSERT ON hydration_entries
  FOR EACH ROW EXECUTE FUNCTION fn_update_hydration_streak();

-- Mise à jour streak habits (≥1 habit complétée dans le jour)
CREATE OR REPLACE FUNCTION fn_update_habits_streak()
RETURNS TRIGGER AS $$
DECLARE
  v_yesterday DATE;
  v_current   INT;
  v_best      INT;
  v_last_date DATE;
BEGIN
  SELECT habits_current, habits_best, habits_last_date
    INTO v_current, v_best, v_last_date
    FROM recovery_streaks WHERE user_id = NEW.user_id;

  IF v_last_date = NEW.log_date THEN RETURN NEW; END IF;

  v_yesterday := NEW.log_date - INTERVAL '1 day';

  IF v_last_date IS NULL OR v_last_date < v_yesterday THEN
    v_current := 1;
  ELSIF v_last_date = v_yesterday THEN
    v_current := v_current + 1;
  END IF;

  v_best := GREATEST(v_best, v_current);

  UPDATE recovery_streaks
    SET habits_current = v_current,
        habits_best = v_best,
        habits_last_date = NEW.log_date,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;

  PERFORM fn_check_streak_badges(NEW.user_id, 'habits', v_current);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_habits_streak
  AFTER INSERT ON habit_logs
  FOR EACH ROW EXECUTE FUNCTION fn_update_habits_streak();

-- ═══════════════════════════════════════════════════════════════════════════
-- 4) Badges
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_check_streak_badges(
  p_user_id UUID,
  p_kind    TEXT,    -- 'sleep' | 'hydration' | 'habits'
  p_streak  INT
) RETURNS VOID AS $$
DECLARE
  v_badge badge_kind;
BEGIN
  v_badge := NULL;
  IF p_streak >= 100 THEN
    v_badge := (p_kind || '_100d')::badge_kind;
  ELSIF p_streak >= 30 THEN
    v_badge := (p_kind || '_30d')::badge_kind;
  ELSIF p_streak >= 7 THEN
    v_badge := (p_kind || '_7d')::badge_kind;
  END IF;

  IF v_badge IS NOT NULL THEN
    INSERT INTO recovery_badges (user_id, kind) VALUES (p_user_id, v_badge)
    ON CONFLICT (user_id, kind) DO NOTHING;
  END IF;
EXCEPTION WHEN invalid_text_representation THEN
  -- Badge inexistant : on ignore silencieusement
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5) Calcul du Recovery Score (0-100)
--   - Sommeil 40 pts : moyenne durée 7 derniers jours (7h = 28pts, 8h = 40pts, plafonné)
--   - Hydratation 30 pts : % de jours où target atteint
--   - Habits 30 pts : nombre moyen d'habits complétées / habits actives
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_compute_recovery_score(p_user_id UUID)
RETURNS SMALLINT AS $$
DECLARE
  v_today      DATE := CURRENT_DATE;
  v_d7         DATE := CURRENT_DATE - INTERVAL '7 days';

  v_sleep_avg  NUMERIC;
  v_sleep_pts  NUMERIC;

  v_target     INT;
  v_hyd_days   INT;
  v_hyd_pts    NUMERIC;

  v_habits_active   INT;
  v_habits_done_avg NUMERIC;
  v_habits_pts      NUMERIC;

  v_score      SMALLINT;
BEGIN
  -- Sommeil : moyenne minutes sur 7j → score
  SELECT COALESCE(AVG(duration_min), 0) INTO v_sleep_avg
    FROM sleep_sessions
    WHERE user_id = p_user_id AND sleep_date BETWEEN v_d7 AND v_today;

  -- 480 min (8h) = 40 pts, 420 min (7h) = 28 pts, 360 min (6h) = 16 pts
  v_sleep_pts := LEAST(40, GREATEST(0, (v_sleep_avg - 240) / 6));

  -- Hydratation : % jours target atteint
  SELECT target_ml INTO v_target FROM hydration_targets WHERE user_id = p_user_id;
  v_target := COALESCE(v_target, 2500);

  SELECT COUNT(*)::INT INTO v_hyd_days
    FROM hydration_daily
    WHERE user_id = p_user_id
      AND drank_date BETWEEN v_d7 AND v_today
      AND total_ml >= v_target;

  v_hyd_pts := (v_hyd_days::NUMERIC / 7) * 30;

  -- Habits : taux moyen de complétion
  SELECT COUNT(*)::INT INTO v_habits_active
    FROM habits WHERE user_id = p_user_id AND NOT archived;

  IF v_habits_active = 0 THEN
    v_habits_pts := 0;
  ELSE
    SELECT COALESCE(COUNT(*)::NUMERIC / 7, 0) INTO v_habits_done_avg
      FROM habit_logs
      WHERE user_id = p_user_id
        AND log_date BETWEEN v_d7 AND v_today;

    v_habits_pts := LEAST(30, (v_habits_done_avg / v_habits_active) * 30);
  END IF;

  v_score := LEAST(100, GREATEST(0, ROUND(v_sleep_pts + v_hyd_pts + v_habits_pts)))::SMALLINT;

  UPDATE recovery_streaks
    SET recovery_score = v_score,
        score_updated_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;

  -- Badges score
  IF v_score >= 95 THEN
    INSERT INTO recovery_badges (user_id, kind) VALUES (p_user_id, 'recovery_score_95')
    ON CONFLICT DO NOTHING;
  ELSIF v_score >= 80 THEN
    INSERT INTO recovery_badges (user_id, kind) VALUES (p_user_id, 'recovery_score_80')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6) pg_cron : recalcul recovery_score chaque jour à 03:00 UTC (= 04/05h Brussels)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Recalcul recovery_score quotidien
SELECT cron.schedule(
  'recovery-score-daily',
  '0 3 * * *',
  $$
    DO $body$
    DECLARE u_id UUID;
    BEGIN
      FOR u_id IN SELECT id FROM profiles LOOP
        PERFORM fn_compute_recovery_score(u_id);
      END LOOP;
    END;
    $body$;
  $$
);

-- Reset streaks quand un jour est manqué (00:30 UTC → début de journée Brussels)
CREATE OR REPLACE FUNCTION fn_reset_broken_streaks()
RETURNS VOID AS $$
DECLARE
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
  -- Sommeil manqué hier
  UPDATE recovery_streaks
    SET sleep_current = 0
    WHERE sleep_last_date IS NOT NULL
      AND sleep_last_date < v_yesterday
      AND sleep_current > 0;

  -- Hydratation manquée hier
  UPDATE recovery_streaks
    SET hydration_current = 0
    WHERE hydration_last_date IS NOT NULL
      AND hydration_last_date < v_yesterday
      AND hydration_current > 0;

  -- Habits manqués hier
  UPDATE recovery_streaks
    SET habits_current = 0
    WHERE habits_last_date IS NOT NULL
      AND habits_last_date < v_yesterday
      AND habits_current > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule(
  'recovery-streaks-reset',
  '30 0 * * *',
  $$ SELECT fn_reset_broken_streaks(); $$
);

-- Trigger Edge Function pour les rappels (toutes les 30 min)
-- L'Edge Function 'recovery-reminders' filtre par timezone & heure locale
SELECT cron.schedule(
  'recovery-reminders-tick',
  '*/30 * * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/recovery-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

COMMENT ON FUNCTION fn_compute_recovery_score IS
  'Recovery Score 0-100. Sommeil 40pts (moyenne 7j) + Hydratation 30pts (% jours target) + Habits 30pts (taux complétion).';
