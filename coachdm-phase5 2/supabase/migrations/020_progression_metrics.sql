-- =====================================================================
-- Coach DM · Phase 5 · Migration 020
-- Body progression metrics: weight, body fat, measurements
-- =====================================================================
-- Sources scientifiques :
-- - Helms et al. 2014 (Athletic body composition tracking)
-- - Lockie et al. 2017 (Anthropometric monitoring frequency)
-- =====================================================================

-- Table unifiée pour toutes les mesures corporelles
CREATE TABLE IF NOT EXISTS public.body_metrics (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_at     timestamptz NOT NULL DEFAULT now(),
  measured_date   date GENERATED ALWAYS AS ((measured_at AT TIME ZONE 'Europe/Brussels')::date) STORED,

  -- Mesures principales (kg, %)
  weight_kg       numeric(5,2) CHECK (weight_kg IS NULL OR (weight_kg > 20 AND weight_kg < 300)),
  body_fat_pct    numeric(4,2) CHECK (body_fat_pct IS NULL OR (body_fat_pct > 2 AND body_fat_pct < 60)),
  muscle_mass_kg  numeric(5,2) CHECK (muscle_mass_kg IS NULL OR (muscle_mass_kg > 10 AND muscle_mass_kg < 150)),
  water_pct       numeric(4,2) CHECK (water_pct IS NULL OR (water_pct > 30 AND water_pct < 80)),

  -- Mensurations (cm)
  neck_cm         numeric(4,1) CHECK (neck_cm IS NULL OR (neck_cm > 20 AND neck_cm < 60)),
  chest_cm        numeric(4,1) CHECK (chest_cm IS NULL OR (chest_cm > 50 AND chest_cm < 200)),
  waist_cm        numeric(4,1) CHECK (waist_cm IS NULL OR (waist_cm > 40 AND waist_cm < 200)),
  hips_cm         numeric(4,1) CHECK (hips_cm IS NULL OR (hips_cm > 50 AND hips_cm < 200)),
  biceps_left_cm  numeric(4,1) CHECK (biceps_left_cm IS NULL OR (biceps_left_cm > 15 AND biceps_left_cm < 70)),
  biceps_right_cm numeric(4,1) CHECK (biceps_right_cm IS NULL OR (biceps_right_cm > 15 AND biceps_right_cm < 70)),
  thigh_left_cm   numeric(4,1) CHECK (thigh_left_cm IS NULL OR (thigh_left_cm > 30 AND thigh_left_cm < 100)),
  thigh_right_cm  numeric(4,1) CHECK (thigh_right_cm IS NULL OR (thigh_right_cm > 30 AND thigh_right_cm < 100)),
  calf_left_cm    numeric(4,1) CHECK (calf_left_cm IS NULL OR (calf_left_cm > 20 AND calf_left_cm < 70)),
  calf_right_cm   numeric(4,1) CHECK (calf_right_cm IS NULL OR (calf_right_cm > 20 AND calf_right_cm < 70)),

  -- Source et notes
  source          text NOT NULL DEFAULT 'manual'
                  CHECK (source IN ('manual','healthkit','google_fit','smart_scale')),
  external_id     text,
  notes           text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Anti-doublon pour syncs externes
  CONSTRAINT body_metrics_external_unique UNIQUE (user_id, source, external_id)
);

CREATE INDEX IF NOT EXISTS body_metrics_user_date_idx
  ON public.body_metrics (user_id, measured_date DESC);
CREATE INDEX IF NOT EXISTS body_metrics_user_measured_idx
  ON public.body_metrics (user_id, measured_at DESC);

-- =====================================================================
-- Trigger updated_at
-- =====================================================================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS body_metrics_set_updated_at ON public.body_metrics;
CREATE TRIGGER body_metrics_set_updated_at
  BEFORE UPDATE ON public.body_metrics
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =====================================================================
-- RLS
-- =====================================================================
ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS body_metrics_select_self ON public.body_metrics;
CREATE POLICY body_metrics_select_self ON public.body_metrics
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS body_metrics_insert_self ON public.body_metrics;
CREATE POLICY body_metrics_insert_self ON public.body_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS body_metrics_update_self ON public.body_metrics;
CREATE POLICY body_metrics_update_self ON public.body_metrics
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS body_metrics_delete_self ON public.body_metrics;
CREATE POLICY body_metrics_delete_self ON public.body_metrics
  FOR DELETE USING (auth.uid() = user_id);

-- Coach peut lire les métriques de ses clients (lien via coach_clients de Phase 3)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='coach_clients'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS body_metrics_select_coach ON public.body_metrics';
    EXECUTE $P$
      CREATE POLICY body_metrics_select_coach ON public.body_metrics
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.coach_clients cc
          WHERE cc.client_id = body_metrics.user_id
            AND cc.coach_id = auth.uid()
            AND cc.status = 'active'
        )
      )
    $P$;
  END IF;
END$$;

-- =====================================================================
-- Vue agrégée hebdo (lissage des fluctuations quotidiennes)
-- Helms 2014 : moyenne hebdo > pesée unique pour décisions diet
-- =====================================================================
CREATE OR REPLACE VIEW public.body_metrics_weekly AS
SELECT
  user_id,
  date_trunc('week', measured_date)::date AS week_start,
  AVG(weight_kg)::numeric(5,2)            AS avg_weight_kg,
  MIN(weight_kg)                           AS min_weight_kg,
  MAX(weight_kg)                           AS max_weight_kg,
  AVG(body_fat_pct)::numeric(4,2)          AS avg_body_fat_pct,
  AVG(waist_cm)::numeric(4,1)              AS avg_waist_cm,
  COUNT(*) FILTER (WHERE weight_kg IS NOT NULL) AS weight_entries
FROM public.body_metrics
WHERE measured_date >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY user_id, week_start;

COMMENT ON TABLE public.body_metrics IS
  'Coach DM Phase 5 — Body composition & anthropometric tracking. Helms 2014, Lockie 2017.';
