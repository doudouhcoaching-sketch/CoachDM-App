-- ═══════════════════════════════════════════════════════════════════════════
-- COACH DM · Phase 4 · Migration 017 — Hydration tracking
-- ═══════════════════════════════════════════════════════════════════════════
-- Hydratation quotidienne, objectif personnalisé, rappels via pg_cron
-- Référence scientifique : EFSA 2010 (2.0L femmes / 2.5L hommes adultes, ajusté)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Objectif quotidien par utilisateur
CREATE TABLE IF NOT EXISTS hydration_targets (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  target_ml         INT NOT NULL DEFAULT 2500 CHECK (target_ml BETWEEN 500 AND 8000),

  -- Heures de rappel (saisies HH:MM en local, on stocke comme TIME)
  reminder_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_start    TIME NOT NULL DEFAULT '08:00',
  reminder_end      TIME NOT NULL DEFAULT '21:00',
  reminder_interval_min INT NOT NULL DEFAULT 120 CHECK (reminder_interval_min BETWEEN 30 AND 360),

  -- Timezone du user (pour pg_cron)
  timezone          TEXT NOT NULL DEFAULT 'Europe/Brussels',

  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Entrées (chaque verre/bouteille bu)
CREATE TABLE IF NOT EXISTS hydration_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_ml   INT NOT NULL CHECK (amount_ml BETWEEN 50 AND 2000),
  drank_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Date locale (calculée via timezone du user) pour agrégation rapide
  drank_date  DATE NOT NULL,

  source      TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'quick_add', 'healthkit', 'google_fit')),
  external_id TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT hydration_unique_external UNIQUE (user_id, source, external_id)
);

CREATE INDEX idx_hydration_user_date ON hydration_entries (user_id, drank_date DESC);
CREATE INDEX idx_hydration_user_drank_at ON hydration_entries (user_id, drank_at DESC);

-- 3) Vue agrégée journalière
CREATE OR REPLACE VIEW hydration_daily AS
SELECT
  user_id,
  drank_date,
  SUM(amount_ml)::INT AS total_ml,
  COUNT(*)::INT AS entries_count,
  MIN(drank_at) AS first_drink,
  MAX(drank_at) AS last_drink
FROM hydration_entries
GROUP BY user_id, drank_date;

-- RLS
ALTER TABLE hydration_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE hydration_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY hydration_targets_owner ON hydration_targets
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY hydration_targets_coach_read ON hydration_targets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_clients cc
      WHERE cc.client_id = hydration_targets.user_id
        AND cc.coach_id = auth.uid()
        AND cc.status = 'active'
    )
  );

CREATE POLICY hydration_entries_owner ON hydration_entries
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY hydration_entries_coach_read ON hydration_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_clients cc
      WHERE cc.client_id = hydration_entries.user_id
        AND cc.coach_id = auth.uid()
        AND cc.status = 'active'
    )
  );

-- Super admin voit tout
CREATE POLICY hydration_targets_admin ON hydration_targets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY hydration_entries_admin ON hydration_entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Fonction utilitaire : insérer un objectif par défaut à la création du profil
CREATE OR REPLACE FUNCTION fn_init_hydration_target()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO hydration_targets (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS init_hydration_on_profile ON profiles;
CREATE TRIGGER init_hydration_on_profile
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION fn_init_hydration_target();

COMMENT ON TABLE hydration_entries IS
  'Une ligne par "verre bu". Agrégé via la vue hydration_daily.';
