-- ============================================================
-- Coach DM · Phase 6 · Migration 029
-- Cron jobs + Storage bucket community-feed
-- ============================================================

-- ---------- STORAGE BUCKET FEED ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-feed',
  'community-feed',
  FALSE,
  10485760,  -- 10MB
  ARRAY['image/jpeg','image/png','image/webp']::TEXT[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "community-feed upload self" ON storage.objects;
CREATE POLICY "community-feed upload self" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'community-feed'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "community-feed read self" ON storage.objects;
CREATE POLICY "community-feed read self" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'community-feed'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "community-feed delete self" ON storage.objects;
CREATE POLICY "community-feed delete self" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'community-feed'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

-- ---------- CHALLENGE COVERS BUCKET ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-challenges',
  'community-challenges',
  FALSE,
  5242880,  -- 5MB
  ARRAY['image/jpeg','image/png','image/webp']::TEXT[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "community-challenges upload coach" ON storage.objects;
CREATE POLICY "community-challenges upload coach" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'community-challenges'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "community-challenges read auth" ON storage.objects;
CREATE POLICY "community-challenges read auth" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'community-challenges');

-- ============================================================
-- CRON JOBS (pg_cron)
-- ============================================================

-- Helper : tente d'activer pg_cron silencieusement si pas déjà fait
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'pg_cron extension already installed by superuser';
END;
$$;

-- Job 1 : expirer les stories non-featured (toutes les heures)
SELECT cron.schedule(
  'community_expire_stories',
  '0 * * * *',
  $$ SELECT public.fn_expire_stories(); $$
);

-- Job 2 : refresh leaderboards (chaque nuit 04:00 UTC)
SELECT cron.schedule(
  'community_refresh_leaderboards',
  '0 4 * * *',
  $$ SELECT public.fn_refresh_leaderboards_all(); $$
);

-- Job 3 : recompute challenges actifs (chaque nuit 03:30 UTC, après recovery 03:00)
CREATE OR REPLACE FUNCTION public.fn_recompute_active_challenges()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_count INT := 0;
BEGIN
  FOR r IN
    SELECT id FROM public.community_challenges
     WHERE status = 'active'
       AND CURRENT_DATE BETWEEN starts_at AND ends_at
  LOOP
    PERFORM public.fn_recompute_challenge_all(r.id);
    v_count := v_count + 1;
  END LOOP;

  -- Marquer challenges terminés
  UPDATE public.community_challenges
     SET status = 'completed'
   WHERE status = 'active'
     AND ends_at < CURRENT_DATE;

  RETURN v_count;
END;
$$;

SELECT cron.schedule(
  'community_recompute_challenges',
  '30 3 * * *',
  $$ SELECT public.fn_recompute_active_challenges(); $$
);

-- Job 4 : notifier top 3 leaderboards (lundi 08:00 UTC, après refresh dimanche soir)
CREATE OR REPLACE FUNCTION public.fn_notify_leaderboard_top3()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_count INT := 0;
  v_prev_week_start DATE;
BEGIN
  -- Lundi précédent (la semaine qui vient de se terminer)
  v_prev_week_start := (CURRENT_DATE - 7 - ((EXTRACT(DOW FROM CURRENT_DATE - 7)::INT + 6) % 7))::DATE;

  FOR r IN
    SELECT le.user_id, le.coach_id, le.rank, le.metric
      FROM public.leaderboard_entries le
     WHERE le.period = 'week'
       AND le.period_start = v_prev_week_start
       AND le.rank <= 3
       AND le.value > 0
  LOOP
    INSERT INTO public.community_notifications(
      user_id, kind, title_fr, title_en, title_nl,
      body_fr, body_en, body_nl, ref_table, ref_id
    ) VALUES (
      r.user_id,
      'leaderboard_top3',
      'Top 3 cette semaine 🏆',
      'Top 3 this week 🏆',
      'Top 3 deze week 🏆',
      'Tu es #' || r.rank || ' sur ' || r.metric,
      'You are #' || r.rank || ' on ' || r.metric,
      'Je bent #' || r.rank || ' op ' || r.metric,
      'leaderboard_entries',
      NULL
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

SELECT cron.schedule(
  'community_leaderboard_top3_notif',
  '0 8 * * 1',
  $$ SELECT public.fn_notify_leaderboard_top3(); $$
);
