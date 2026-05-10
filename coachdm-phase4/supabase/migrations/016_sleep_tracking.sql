-- ═══════════════════════════════════════════════════════════════════════════
-- COACH DM · Phase 4 · Migration 016 — Sleep tracking
-- ═══════════════════════════════════════════════════════════════════════════
-- Sommeil : durée, qualité, HRV (via HealthKit/Google Fit ou saisie manuelle)
-- Source données : 'manual' | 'healthkit' | 'google_fit'
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE sleep_source AS ENUM ('manual', 'healthkit', 'google_fit');

CREATE TABLE IF NOT EXISTS sleep_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Date de référence = nuit "qui se termine le matin de cette date"
  -- Ex: nuit du 09→10 mai 2026 → sleep_date = 2026-05-10
  sleep_date      DATE NOT NULL,

  bedtime         TIMESTAMPTZ NOT NULL,
  wake_time       TIMESTAMPTZ NOT NULL,
  duration_min    INT GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (wake_time - bedtime)) / 60)::INT STORED,

  -- Qualité 1..5 (saisie manuelle)
  quality         SMALLINT CHECK (quality BETWEEN 1 AND 5),

  -- HRV (ms RMSSD) — via HealthKit/Google Fit, optionnel
  hrv_rmssd_ms    NUMERIC(6,2),

  -- Phases (si fournies par HealthKit)
  deep_min        INT,
  rem_min         INT,
  light_min       INT,
  awake_min       INT,

  source          sleep_source NOT NULL DEFAULT 'manual',
  external_id     TEXT, -- UUID HealthKit ou ID Google Fit (anti-doublon)
  notes           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT sleep_unique_per_day UNIQUE (user_id, sleep_date),
  CONSTRAINT sleep_unique_external UNIQUE (user_id, source, external_id),
  CONSTRAINT sleep_valid_window CHECK (wake_time > bedtime),
  CONSTRAINT sleep_reasonable_duration CHECK (
    EXTRACT(EPOCH FROM (wake_time - bedtime)) BETWEEN 1800 AND 64800 -- 30min..18h
  )
);

CREATE INDEX idx_sleep_user_date ON sleep_sessions (user_id, sleep_date DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION trg_sleep_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER sleep_updated_at
  BEFORE UPDATE ON sleep_sessions
  FOR EACH ROW EXECUTE FUNCTION trg_sleep_updated_at();

-- RLS
ALTER TABLE sleep_sessions ENABLE ROW LEVEL SECURITY;

-- Le client voit ses propres sessions
CREATE POLICY sleep_owner_all ON sleep_sessions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Le coach assigné voit les sessions de ses clients
CREATE POLICY sleep_coach_read ON sleep_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_clients cc
      WHERE cc.client_id = sleep_sessions.user_id
        AND cc.coach_id = auth.uid()
        AND cc.status = 'active'
    )
  );

-- Super admin voit tout
CREATE POLICY sleep_admin_read ON sleep_sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

COMMENT ON TABLE sleep_sessions IS
  'Sessions de sommeil. 1 par nuit max (UNIQUE user_id, sleep_date). Source manual/healthkit/google_fit.';
