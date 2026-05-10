-- ═══════════════════════════════════════════════════════════════════════════
-- COACH DM · Phase 4 · Migration 015b (optionnelle/défensive)
-- ═══════════════════════════════════════════════════════════════════════════
-- À appliquer UNIQUEMENT si profiles.expo_push_token ou profiles.language
-- n'existent pas déjà après les Phases 1-3.
--
-- Vérification rapide :
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'profiles'
--      AND column_name IN ('expo_push_token', 'language', 'role');
--
-- Si un (ou plusieurs) résultat manque, exécuter ce script.
-- ═══════════════════════════════════════════════════════════════════════════

-- Push token Expo (utilisé par recovery-reminders + Phase 3 push)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- Langue préférée pour les notifications & UI (FR par défaut, priorité Coach DM)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'fr'
    CHECK (language IN ('fr', 'en', 'nl'));

-- Rôle (super_admin / coach / client) — si pas créé en Phase 3
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'client'
      CHECK (role IN ('super_admin', 'coach', 'client'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles (expo_push_token)
  WHERE expo_push_token IS NOT NULL;

COMMENT ON COLUMN profiles.expo_push_token IS
  'Token Expo Push (1 device par user — le dernier device connecté écrase).';
COMMENT ON COLUMN profiles.language IS
  'Langue préférée fr/en/nl (priorité FR Coach DM).';
