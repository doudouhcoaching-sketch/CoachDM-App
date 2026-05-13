-- ============================================================
-- Coach DM · Phase 6 · Migration 024
-- Community Posts Feed (coach-scoped)
-- ============================================================
-- Architecture : chaque coach a son propre feed privé.
-- Les clients d'un même coach voient les posts entre eux.
-- Les posts peuvent être de type : text, image, workout_share,
-- pr_celebration (auto), transformation, recovery_milestone.
-- ============================================================

-- ---------- POSTS ----------
CREATE TABLE IF NOT EXISTS public.community_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN (
                  'text',
                  'image',
                  'workout_share',
                  'pr_celebration',
                  'transformation',
                  'recovery_milestone',
                  'challenge_progress'
                )),
  content       TEXT,
  image_url     TEXT,
  -- Référence optionnelle vers une entité métier (PR, workout, etc.)
  ref_table     TEXT,
  ref_id        UUID,
  -- Modération
  status        TEXT NOT NULL DEFAULT 'visible' CHECK (status IN (
                  'visible', 'hidden', 'flagged', 'removed'
                )),
  hidden_reason TEXT,
  hidden_by     UUID REFERENCES public.profiles(id),
  hidden_at     TIMESTAMPTZ,
  -- Compteurs dénormalisés (mis à jour par triggers)
  reactions_count INT NOT NULL DEFAULT 0,
  comments_count  INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_coach_created
  ON public.community_posts(coach_id, created_at DESC)
  WHERE status = 'visible';

CREATE INDEX IF NOT EXISTS idx_community_posts_author
  ON public.community_posts(author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_flagged
  ON public.community_posts(coach_id, status)
  WHERE status IN ('flagged', 'hidden');

-- ---------- COMMENTS ----------
CREATE TABLE IF NOT EXISTS public.community_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 1000),
  status      TEXT NOT NULL DEFAULT 'visible' CHECK (status IN (
                'visible', 'hidden', 'removed'
              )),
  hidden_by   UUID REFERENCES public.profiles(id),
  hidden_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_comments_post
  ON public.community_comments(post_id, created_at ASC)
  WHERE status = 'visible';

-- ---------- REACTIONS ----------
-- 6 réactions Coach DM : fire, muscle, clap, gold, brain, heart
CREATE TABLE IF NOT EXISTS public.community_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN (
                'fire', 'muscle', 'clap', 'gold', 'brain', 'heart'
              )),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_community_reactions_post
  ON public.community_reactions(post_id);

-- ---------- REPORTS (signalements user) ----------
CREATE TABLE IF NOT EXISTS public.community_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id    UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
  reporter_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason        TEXT NOT NULL CHECK (reason IN (
                  'spam', 'inappropriate', 'harassment', 'misinformation', 'other'
                )),
  details       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                  'pending', 'reviewed', 'dismissed'
                )),
  reviewed_by   UUID REFERENCES public.profiles(id),
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((post_id IS NOT NULL) OR (comment_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_community_reports_pending
  ON public.community_reports(status, created_at DESC)
  WHERE status = 'pending';

-- ============================================================
-- TRIGGERS : compteurs dénormalisés
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_community_update_reactions_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
       SET reactions_count = reactions_count + 1
     WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
       SET reactions_count = GREATEST(0, reactions_count - 1)
     WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_community_reactions_count ON public.community_reactions;
CREATE TRIGGER trg_community_reactions_count
AFTER INSERT OR DELETE ON public.community_reactions
FOR EACH ROW EXECUTE FUNCTION public.fn_community_update_reactions_count();

CREATE OR REPLACE FUNCTION public.fn_community_update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'visible' THEN
    UPDATE public.community_posts
       SET comments_count = comments_count + 1
     WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'visible' AND NEW.status != 'visible' THEN
      UPDATE public.community_posts
         SET comments_count = GREATEST(0, comments_count - 1)
       WHERE id = NEW.post_id;
    ELSIF OLD.status != 'visible' AND NEW.status = 'visible' THEN
      UPDATE public.community_posts
         SET comments_count = comments_count + 1
       WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'visible' THEN
    UPDATE public.community_posts
       SET comments_count = GREATEST(0, comments_count - 1)
     WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_community_comments_count ON public.community_comments;
CREATE TRIGGER trg_community_comments_count
AFTER INSERT OR UPDATE OR DELETE ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION public.fn_community_update_comments_count();

-- Auto-flag d'un post si 3+ signalements pending
CREATE OR REPLACE FUNCTION public.fn_community_auto_flag()
RETURNS TRIGGER AS $$
DECLARE
  report_count INT;
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    SELECT COUNT(*) INTO report_count
      FROM public.community_reports
     WHERE post_id = NEW.post_id AND status = 'pending';
    IF report_count >= 3 THEN
      UPDATE public.community_posts
         SET status = 'flagged'
       WHERE id = NEW.post_id AND status = 'visible';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_community_auto_flag ON public.community_reports;
CREATE TRIGGER trg_community_auto_flag
AFTER INSERT ON public.community_reports
FOR EACH ROW EXECUTE FUNCTION public.fn_community_auto_flag();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.community_posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports   ENABLE ROW LEVEL SECURITY;

-- Helper : un user fait-il partie du même coach que le post ?
CREATE OR REPLACE FUNCTION public.fn_community_can_see_coach(p_coach UUID, p_user UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_coach = p_user
    OR EXISTS (
      SELECT 1 FROM public.coach_clients
       WHERE coach_id = p_coach
         AND client_id = p_user
         AND status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
       WHERE id = p_user AND role = 'super_admin'
    );
$$;

-- POSTS : lecture
DROP POLICY IF EXISTS posts_select ON public.community_posts;
CREATE POLICY posts_select ON public.community_posts
FOR SELECT TO authenticated
USING (
  status = 'visible'
  AND public.fn_community_can_see_coach(coach_id, auth.uid())
);

-- POSTS : lecture coach (voit tout, y compris hidden/flagged)
DROP POLICY IF EXISTS posts_select_coach ON public.community_posts;
CREATE POLICY posts_select_coach ON public.community_posts
FOR SELECT TO authenticated
USING (
  coach_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- POSTS : insert (auteur = uid, doit être client du coach OU le coach lui-même)
DROP POLICY IF EXISTS posts_insert ON public.community_posts;
CREATE POLICY posts_insert ON public.community_posts
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND status = 'visible'
  AND public.fn_community_can_see_coach(coach_id, auth.uid())
);

-- POSTS : update auteur (édition simple, pas changement de status)
DROP POLICY IF EXISTS posts_update_author ON public.community_posts;
CREATE POLICY posts_update_author ON public.community_posts
FOR UPDATE TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid() AND status = 'visible');

-- POSTS : update coach/admin (modération)
DROP POLICY IF EXISTS posts_update_coach ON public.community_posts;
CREATE POLICY posts_update_coach ON public.community_posts
FOR UPDATE TO authenticated
USING (
  coach_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- POSTS : delete (auteur ou coach)
DROP POLICY IF EXISTS posts_delete ON public.community_posts;
CREATE POLICY posts_delete ON public.community_posts
FOR DELETE TO authenticated
USING (
  author_id = auth.uid()
  OR coach_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- COMMENTS : lecture
DROP POLICY IF EXISTS comments_select ON public.community_comments;
CREATE POLICY comments_select ON public.community_comments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.community_posts p
     WHERE p.id = community_comments.post_id
       AND (
         p.coach_id = auth.uid()
         OR public.fn_community_can_see_coach(p.coach_id, auth.uid())
       )
  )
);

-- COMMENTS : insert
DROP POLICY IF EXISTS comments_insert ON public.community_comments;
CREATE POLICY comments_insert ON public.community_comments
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.community_posts p
     WHERE p.id = post_id
       AND p.status = 'visible'
       AND public.fn_community_can_see_coach(p.coach_id, auth.uid())
  )
);

-- COMMENTS : update auteur
DROP POLICY IF EXISTS comments_update_author ON public.community_comments;
CREATE POLICY comments_update_author ON public.community_comments
FOR UPDATE TO authenticated
USING (author_id = auth.uid());

-- COMMENTS : update coach (modération)
DROP POLICY IF EXISTS comments_update_coach ON public.community_comments;
CREATE POLICY comments_update_coach ON public.community_comments
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.community_posts p
     WHERE p.id = community_comments.post_id
       AND (
         p.coach_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
       )
  )
);

-- REACTIONS : RLS
DROP POLICY IF EXISTS reactions_select ON public.community_reactions;
CREATE POLICY reactions_select ON public.community_reactions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.community_posts p
     WHERE p.id = community_reactions.post_id
       AND public.fn_community_can_see_coach(p.coach_id, auth.uid())
  )
);

DROP POLICY IF EXISTS reactions_insert ON public.community_reactions;
CREATE POLICY reactions_insert ON public.community_reactions
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.community_posts p
     WHERE p.id = post_id
       AND p.status = 'visible'
       AND public.fn_community_can_see_coach(p.coach_id, auth.uid())
  )
);

DROP POLICY IF EXISTS reactions_delete ON public.community_reactions;
CREATE POLICY reactions_delete ON public.community_reactions
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- REPORTS : RLS
DROP POLICY IF EXISTS reports_select_own ON public.community_reports;
CREATE POLICY reports_select_own ON public.community_reports
FOR SELECT TO authenticated
USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS reports_select_coach ON public.community_reports;
CREATE POLICY reports_select_coach ON public.community_reports
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.community_posts p
     WHERE p.id = community_reports.post_id
       AND (
         p.coach_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
       )
  )
);

DROP POLICY IF EXISTS reports_insert ON public.community_reports;
CREATE POLICY reports_insert ON public.community_reports
FOR INSERT TO authenticated
WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS reports_update_coach ON public.community_reports;
CREATE POLICY reports_update_coach ON public.community_reports
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.community_posts p
     WHERE p.id = community_reports.post_id
       AND (
         p.coach_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
       )
  )
);

-- Realtime : activer la diffusion
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_reactions;
