-- ============================================================
-- COACH DM — Seed Production (minimal)
-- Path: supabase/seed-prod.sql
-- Important : seed STRICTEMENT minimal en prod, pas de données test.
-- Les 22 programmes Payhip et 80+ exercices sont seedés par migrations.
-- Ce fichier sert uniquement pour les données système.
-- ============================================================

-- 1. Admin coach (Doudouh M.)
-- ⚠ À exécuter MANUELLEMENT via dashboard SQL Editor après création du compte auth.
-- INSERT INTO public.user_profiles (id, role, full_name, locale, tier)
-- VALUES (
--   '<UUID_AUTH_USER>',
--   'admin',
--   'Doudouh M.',
--   'fr',
--   'coach_pro'
-- )
-- ON CONFLICT (id) DO UPDATE SET role = 'admin', tier = 'coach_pro';

-- 2. Disclaimer médical trilingue
INSERT INTO public.system_settings (key, value_fr, value_en, value_nl)
VALUES (
  'medical_disclaimer',
  'Coach DM ne remplace pas l''avis d''un professionnel de santé. En cas de douleur, blessure, ou condition médicale, consulte un médecin avant toute pratique sportive.',
  'Coach DM does not replace medical advice. In case of pain, injury, or medical condition, consult a doctor before any sports practice.',
  'Coach DM vervangt geen medisch advies. Raadpleeg een arts bij pijn, blessures of medische aandoeningen voordat je begint met sporten.'
)
ON CONFLICT (key) DO UPDATE SET
  value_fr = EXCLUDED.value_fr,
  value_en = EXCLUDED.value_en,
  value_nl = EXCLUDED.value_nl;

-- 3. CGV reference Belgique
INSERT INTO public.system_settings (key, value_fr, value_en, value_nl)
VALUES (
  'legal_cgv_ref',
  'Conformément à l''Art. VI.53 du Code de droit économique belge, le contenu numérique téléchargé n''est pas retournable.',
  'Pursuant to Art. VI.53 of the Belgian Code of Economic Law, downloaded digital content is non-returnable.',
  'Overeenkomstig art. VI.53 van het Belgisch Wetboek van economisch recht is gedownloade digitale inhoud niet retourneerbaar.'
)
ON CONFLICT (key) DO UPDATE SET
  value_fr = EXCLUDED.value_fr,
  value_en = EXCLUDED.value_en,
  value_nl = EXCLUDED.value_nl;

-- 4. Brand identity
INSERT INTO public.system_settings (key, value_fr, value_en, value_nl)
VALUES
  ('brand_name', 'Coach DM', 'Coach DM', 'Coach DM'),
  ('brand_tagline', 'Power · Transform · Excel', 'Power · Transform · Excel', 'Power · Transform · Excel'),
  ('brand_bce', 'BE0840.260.421', 'BE0840.260.421', 'BE0840.260.421'),
  ('brand_address', 'Reasfit Vilvoorde, Havenstraat 72b, 1800 Vilvoorde, Belgique',
                   'Reasfit Vilvoorde, Havenstraat 72b, 1800 Vilvoorde, Belgium',
                   'Reasfit Vilvoorde, Havenstraat 72b, 1800 Vilvoorde, België'),
  ('support_email', 'doudouh.coaching@gmail.com', 'doudouh.coaching@gmail.com', 'doudouh.coaching@gmail.com'),
  ('site_url', 'https://coachdm.be', 'https://coachdm.be', 'https://coachdm.be')
ON CONFLICT (key) DO UPDATE SET
  value_fr = EXCLUDED.value_fr,
  value_en = EXCLUDED.value_en,
  value_nl = EXCLUDED.value_nl;

-- 5. Feature flags
INSERT INTO public.feature_flags (key, enabled, description)
VALUES
  ('ai_coach_enabled', true, 'IA Coach Assistant (Phase 7)'),
  ('community_enabled', true, 'Feed posts, challenges, leaderboards'),
  ('wearables_enabled', true, 'Apple Health + Google Fit sync'),
  ('multi_coach_b2b', false, 'Mode B2B autres coachs — activable plus tard')
ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled;

-- ============================================================
-- Note : créer les tables system_settings et feature_flags
-- si elles ne sont pas déjà dans les migrations existantes.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value_fr TEXT NOT NULL,
  value_en TEXT NOT NULL,
  value_nl TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "settings_read_all" ON public.system_settings FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "flags_read_all" ON public.feature_flags FOR SELECT USING (true);
