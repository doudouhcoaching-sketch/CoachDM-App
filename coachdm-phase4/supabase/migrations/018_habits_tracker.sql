-- ═══════════════════════════════════════════════════════════════════════════
-- COACH DM · Phase 4 · Migration 018 — Habits tracker
-- ═══════════════════════════════════════════════════════════════════════════
-- Habitudes : méditation, étirements, mobilité, journaling, custom
-- Système binaire (fait / pas fait) + durée optionnelle + notes
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE habit_category AS ENUM (
  'meditation',
  'stretching',
  'mobility',
  'journaling',
  'breathwork',
  'cold_exposure',
  'sauna',
  'reading',
  'walking',
  'custom'
);

CREATE TYPE habit_frequency AS ENUM ('daily', 'weekly', 'custom');

-- 1) Définition des habitudes (templates par user)
CREATE TABLE IF NOT EXISTS habits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  category        habit_category NOT NULL,
  -- Si category = 'custom', name est obligatoire ; sinon optionnel (libellé i18n côté shared)
  name            TEXT,

  -- Couleur d'accent (hex sans #) — défaut suit le code couleur Coach DM
  color           TEXT DEFAULT 'D4AF37',
  icon            TEXT, -- lucide-react icon name

  frequency       habit_frequency NOT NULL DEFAULT 'daily',
  -- Si frequency = 'weekly' ou 'custom', jours actifs (1=Lun..7=Dim)
  active_days     SMALLINT[] DEFAULT ARRAY[1,2,3,4,5,6,7],

  -- Durée cible en minutes (optionnel, pour méditation/étirements/etc.)
  target_minutes  INT CHECK (target_minutes IS NULL OR target_minutes BETWEEN 1 AND 480),

  -- Rappel
  reminder_time   TIME,
  reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,

  archived        BOOLEAN NOT NULL DEFAULT FALSE,
  display_order   INT NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT habit_custom_needs_name CHECK (
    category != 'custom' OR (name IS NOT NULL AND length(name) > 0)
  ),
  CONSTRAINT habit_active_days_valid CHECK (
    active_days <@ ARRAY[1,2,3,4,5,6,7]::smallint[]
  )
);

CREATE INDEX idx_habits_user ON habits (user_id, display_order) WHERE NOT archived;

-- 2) Logs (1 ligne par fait par jour max)
CREATE TABLE IF NOT EXISTS habit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id      UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  log_date      DATE NOT NULL,
  done_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  duration_min  INT CHECK (duration_min IS NULL OR duration_min BETWEEN 1 AND 480),
  notes         TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT habit_log_unique_per_day UNIQUE (habit_id, log_date)
);

CREATE INDEX idx_habit_logs_user_date ON habit_logs (user_id, log_date DESC);
CREATE INDEX idx_habit_logs_habit_date ON habit_logs (habit_id, log_date DESC);

-- Trigger updated_at
CREATE TRIGGER habits_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION trg_sleep_updated_at(); -- réutilise la fonction de 016

-- RLS
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY habits_owner ON habits
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY habits_coach_read ON habits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_clients cc
      WHERE cc.client_id = habits.user_id
        AND cc.coach_id = auth.uid()
        AND cc.status = 'active'
    )
  );

CREATE POLICY habit_logs_owner ON habit_logs
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY habit_logs_coach_read ON habit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_clients cc
      WHERE cc.client_id = habit_logs.user_id
        AND cc.coach_id = auth.uid()
        AND cc.status = 'active'
    )
  );

CREATE POLICY habits_admin ON habits
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY habit_logs_admin ON habit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

COMMENT ON TABLE habits IS
  'Définition des habitudes (1 ligne = 1 habitude récurrente). Catégories prédéfinies + custom.';
COMMENT ON TABLE habit_logs IS
  'Logs de complétion. UNIQUE par (habit_id, log_date) — 1 fois par jour max.';
