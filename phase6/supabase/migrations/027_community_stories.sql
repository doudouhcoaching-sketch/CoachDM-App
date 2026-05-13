-- ============================================================
-- Coach DM · Phase 6 · Migration 027
-- Stories de transformation (24h visibility OR persistent featured)
-- ============================================================
-- Différent du feed : format vertical, durée limitée, before/after
-- Le coach peut "featurer" une story qui devient persistante (témoignage).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.community_stories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL CHECK (kind IN (
                    'photo',          -- une seule image verticale
                    'before_after',   -- 2 images comparison
                    'milestone'       -- texte + image, ex PR
                  )),
  caption_fr      TEXT,
  caption_en      TEXT,
  caption_nl      TEXT,
  image_url       TEXT NOT NULL,
  image_before_url TEXT,             -- only for before_after
  -- Stat affichée (ex : -8kg, +20kg squat)
  stat_label      TEXT,
  stat_value      TEXT,
  -- 24h par défaut, sauf featured
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  featured        BOOLEAN NOT NULL DEFAULT FALSE,
  featured_by     UUID REFERENCES public.profiles(id),
  featured_at     TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'visible' CHECK (status IN (
                    'visible', 'hidden', 'expired', 'removed'
                  )),
  views_count     INT NOT NULL DEFAULT 0,
  reactions_count INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stories_coach_active
  ON public.community_stories(coach_id, created_at DESC)
  WHERE status = 'visible' AND (featured = TRUE OR expires_at > NOW());

CREATE INDEX IF NOT EXISTS idx_stories_featured
  ON public.community_stories(coach_id, featured_at DESC)
  WHERE featured = TRUE AND status = 'visible';

CREATE INDEX IF NOT EXISTS idx_stories_expires
  ON public.community_stories(expires_at)
  WHERE status = 'visible' AND featured = FALSE;

-- ---------- VIEWS (qui a vu quoi) ----------
CREATE TABLE IF NOT EXISTS public.community_story_views (
  story_id    UUID NOT NULL REFERENCES public.community_stories(id) ON DELETE CASCADE,
  viewer_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (story_id, viewer_id)
);

-- ---------- REACTIONS STORIES ----------
CREATE TABLE IF NOT EXISTS public.community_story_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id    UUID NOT NULL REFERENCES public.community_stories(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('fire','muscle','clap','gold','brain','heart')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(story_id, user_id, kind)
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Incrémente views_count à l'insertion view (idempotent par PK)
CREATE OR REPLACE FUNCTION public.fn_story_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.community_stories
     SET views_count = views_count + 1
   WHERE id = NEW.story_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_story_view_count ON public.community_story_views;
CREATE TRIGGER trg_story_view_count
AFTER INSERT ON public.community_story_views
FOR EACH ROW EXECUTE FUNCTION public.fn_story_view_count();

-- Reactions count
CREATE OR REPLACE FUNCTION public.fn_story_reactions_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_stories SET reactions_count = reactions_count + 1 WHERE id = NEW.story_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_stories SET reactions_count = GREATEST(0, reactions_count - 1) WHERE id = OLD.story_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_story_reactions_count ON public.community_story_reactions;
CREATE TRIGGER trg_story_reactions_count
AFTER INSERT OR DELETE ON public.community_story_reactions
FOR EACH ROW EXECUTE FUNCTION public.fn_story_reactions_count();

-- Fonction : expirer les stories non featured arrivées à terme
CREATE OR REPLACE FUNCTION public.fn_expire_stories()
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.community_stories
     SET status = 'expired'
   WHERE status = 'visible'
     AND featured = FALSE
     AND expires_at < NOW()
  RETURNING 1;
$$;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.community_stories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_story_views     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_story_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stories_select ON public.community_stories;
CREATE POLICY stories_select ON public.community_stories
FOR SELECT TO authenticated
USING (
  status = 'visible'
  AND (featured = TRUE OR expires_at > NOW())
  AND public.fn_community_can_see_coach(coach_id, auth.uid())
);

DROP POLICY IF EXISTS stories_select_coach ON public.community_stories;
CREATE POLICY stories_select_coach ON public.community_stories
FOR SELECT TO authenticated
USING (
  coach_id = auth.uid()
  OR author_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS stories_insert ON public.community_stories;
CREATE POLICY stories_insert ON public.community_stories
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND public.fn_community_can_see_coach(coach_id, auth.uid())
);

DROP POLICY IF EXISTS stories_update_author ON public.community_stories;
CREATE POLICY stories_update_author ON public.community_stories
FOR UPDATE TO authenticated USING (author_id = auth.uid());

DROP POLICY IF EXISTS stories_update_coach ON public.community_stories;
CREATE POLICY stories_update_coach ON public.community_stories
FOR UPDATE TO authenticated USING (coach_id = auth.uid());

DROP POLICY IF EXISTS stories_delete ON public.community_stories;
CREATE POLICY stories_delete ON public.community_stories
FOR DELETE TO authenticated
USING (author_id = auth.uid() OR coach_id = auth.uid());

-- VIEWS
DROP POLICY IF EXISTS sv_select ON public.community_story_views;
CREATE POLICY sv_select ON public.community_story_views
FOR SELECT TO authenticated
USING (
  viewer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.community_stories s
     WHERE s.id = community_story_views.story_id
       AND (s.author_id = auth.uid() OR s.coach_id = auth.uid())
  )
);

DROP POLICY IF EXISTS sv_insert ON public.community_story_views;
CREATE POLICY sv_insert ON public.community_story_views
FOR INSERT TO authenticated WITH CHECK (viewer_id = auth.uid());

-- REACTIONS
DROP POLICY IF EXISTS sr_select ON public.community_story_reactions;
CREATE POLICY sr_select ON public.community_story_reactions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.community_stories s
     WHERE s.id = community_story_reactions.story_id
       AND public.fn_community_can_see_coach(s.coach_id, auth.uid())
  )
);

DROP POLICY IF EXISTS sr_insert ON public.community_story_reactions;
CREATE POLICY sr_insert ON public.community_story_reactions
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS sr_delete ON public.community_story_reactions;
CREATE POLICY sr_delete ON public.community_story_reactions
FOR DELETE TO authenticated USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.community_stories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_story_reactions;

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-stories',
  'community-stories',
  FALSE,
  10485760,  -- 10MB
  ARRAY['image/jpeg','image/png','image/webp']::TEXT[]
)
ON CONFLICT (id) DO NOTHING;

-- Policy lecture : public via signed URL servies par RLS table (table-driven access)
DROP POLICY IF EXISTS "community-stories upload self" ON storage.objects;
CREATE POLICY "community-stories upload self" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'community-stories'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "community-stories read self" ON storage.objects;
CREATE POLICY "community-stories read self" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'community-stories'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "community-stories delete self" ON storage.objects;
CREATE POLICY "community-stories delete self" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'community-stories'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);
