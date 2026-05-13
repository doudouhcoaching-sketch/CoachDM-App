-- =====================================================================
-- Coach DM · Phase 5 · Migration 023
-- Progress photos — slider avant/après + timeline grille
-- =====================================================================

-- ---------------------------------------------------------------------
-- Table progress_photos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.progress_photos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Catégorie d'angle
  pose            text NOT NULL CHECK (pose IN ('front','side_left','side_right','back','custom')),

  -- Storage path (bucket Supabase Storage : progress-photos)
  storage_path    text NOT NULL,
  thumbnail_path  text,

  -- Métadonnées
  taken_at        timestamptz NOT NULL DEFAULT now(),
  taken_date      date GENERATED ALWAYS AS ((taken_at AT TIME ZONE 'Europe/Brussels')::date) STORED,
  weight_kg       numeric(5,2),     -- snapshot du poids ce jour-là
  body_fat_pct    numeric(4,2),     -- snapshot du body fat
  notes           text,

  -- Visibilité (privé par défaut, opt-in pour partage avec coach)
  visible_to_coach boolean NOT NULL DEFAULT true,

  created_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS progress_photos_user_pose_date_idx
  ON public.progress_photos (user_id, pose, taken_date DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS progress_photos_user_date_idx
  ON public.progress_photos (user_id, taken_date DESC)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------
-- Table photo_comparisons (slider avant/après sauvegardé)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.photo_comparisons (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  before_photo_id   uuid NOT NULL REFERENCES public.progress_photos(id) ON DELETE CASCADE,
  after_photo_id    uuid NOT NULL REFERENCES public.progress_photos(id) ON DELETE CASCADE,
  title             text,
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT photo_comparisons_distinct_photos CHECK (before_photo_id <> after_photo_id)
);

CREATE INDEX IF NOT EXISTS photo_comparisons_user_idx
  ON public.photo_comparisons (user_id, created_at DESC);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_comparisons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS progress_photos_select_self ON public.progress_photos;
CREATE POLICY progress_photos_select_self ON public.progress_photos
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS progress_photos_insert_self ON public.progress_photos;
CREATE POLICY progress_photos_insert_self ON public.progress_photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS progress_photos_update_self ON public.progress_photos;
CREATE POLICY progress_photos_update_self ON public.progress_photos
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS progress_photos_delete_self ON public.progress_photos;
CREATE POLICY progress_photos_delete_self ON public.progress_photos
  FOR DELETE USING (auth.uid() = user_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='coach_clients'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS progress_photos_select_coach ON public.progress_photos';
    EXECUTE $P$
      CREATE POLICY progress_photos_select_coach ON public.progress_photos
      FOR SELECT USING (
        deleted_at IS NULL
        AND visible_to_coach = true
        AND EXISTS (
          SELECT 1 FROM public.coach_clients cc
          WHERE cc.client_id = progress_photos.user_id
            AND cc.coach_id = auth.uid()
            AND cc.status = 'active'
        )
      )
    $P$;
  END IF;
END$$;

-- Comparisons RLS
DROP POLICY IF EXISTS photo_comparisons_select_self ON public.photo_comparisons;
CREATE POLICY photo_comparisons_select_self ON public.photo_comparisons
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS photo_comparisons_insert_self ON public.photo_comparisons;
CREATE POLICY photo_comparisons_insert_self ON public.photo_comparisons
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS photo_comparisons_delete_self ON public.photo_comparisons;
CREATE POLICY photo_comparisons_delete_self ON public.photo_comparisons
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Storage bucket sécurisé : progress-photos
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'progress-photos',
  'progress-photos',
  false,
  10 * 1024 * 1024, -- 10MB max
  ARRAY['image/jpeg','image/png','image/webp','image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies : owner only, coach read si visible_to_coach
DROP POLICY IF EXISTS "progress_photos_storage_select" ON storage.objects;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='coach_clients'
  ) THEN
    EXECUTE $P$
      CREATE POLICY "progress_photos_storage_select" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'progress-photos'
        AND (
          auth.uid()::text = (storage.foldername(name))[1]
          OR EXISTS (
            SELECT 1
            FROM public.progress_photos pp
            JOIN public.coach_clients cc
              ON cc.client_id = pp.user_id
             AND cc.coach_id = auth.uid()
             AND cc.status = 'active'
            WHERE pp.storage_path = storage.objects.name
              AND pp.visible_to_coach = true
              AND pp.deleted_at IS NULL
          )
        )
      )
    $P$;
  ELSE
    EXECUTE $P$
      CREATE POLICY "progress_photos_storage_select" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'progress-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      )
    $P$;
  END IF;
END$$;

DROP POLICY IF EXISTS "progress_photos_storage_insert" ON storage.objects;
CREATE POLICY "progress_photos_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "progress_photos_storage_delete" ON storage.objects;
CREATE POLICY "progress_photos_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------------------------------------------------------------------
-- Vue : timeline (1 entrée par mois, photo la plus récente par pose)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.progress_photos_timeline AS
SELECT DISTINCT ON (user_id, pose, date_trunc('month', taken_date))
  user_id,
  pose,
  date_trunc('month', taken_date)::date AS month,
  id AS photo_id,
  storage_path,
  thumbnail_path,
  taken_at,
  taken_date,
  weight_kg,
  body_fat_pct
FROM public.progress_photos
WHERE deleted_at IS NULL
ORDER BY user_id, pose, date_trunc('month', taken_date), taken_at DESC;

COMMENT ON TABLE public.progress_photos IS
  'Coach DM Phase 5 — Progress photos (front/side/back) with coach visibility opt-in.';
