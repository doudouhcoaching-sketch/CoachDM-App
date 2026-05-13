-- ============================================================
-- Coach DM · Phase 6 · Migration 028
-- Notifications community (push trilingues)
-- ============================================================
-- Notifications déclenchées par events community :
--  - Nouveau commentaire sur ton post
--  - Réaction sur ton post (groupé toutes les 15 min)
--  - Coach a featured ta story
--  - Nouveau challenge créé par ton coach
--  - Tu as terminé un challenge
--  - Ton coach t'a invité à un challenge privé
-- ============================================================

CREATE TABLE IF NOT EXISTS public.community_notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN (
                  'new_comment',
                  'new_reaction',
                  'story_featured',
                  'new_challenge',
                  'challenge_completed',
                  'challenge_invited',
                  'leaderboard_top3',
                  'post_flagged'
                )),
  title_fr      TEXT NOT NULL,
  title_en      TEXT NOT NULL,
  title_nl      TEXT NOT NULL,
  body_fr       TEXT,
  body_en       TEXT,
  body_nl       TEXT,
  ref_table     TEXT,
  ref_id        UUID,
  read_at       TIMESTAMPTZ,
  pushed_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_notif_user_unread
  ON public.community_notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_community_notif_pending_push
  ON public.community_notifications(created_at)
  WHERE pushed_at IS NULL;

-- ============================================================
-- TRIGGERS : génération auto des notifs
-- ============================================================

-- Notif sur nouveau commentaire → auteur du post
CREATE OR REPLACE FUNCTION public.fn_notify_new_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_post     RECORD;
  v_commenter TEXT;
BEGIN
  SELECT p.author_id, p.coach_id INTO v_post
    FROM public.community_posts p
   WHERE p.id = NEW.post_id;

  IF v_post.author_id IS NULL OR v_post.author_id = NEW.author_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, full_name, 'Quelqu''un') INTO v_commenter
    FROM public.profiles WHERE id = NEW.author_id;

  INSERT INTO public.community_notifications(
    user_id, kind, title_fr, title_en, title_nl,
    body_fr, body_en, body_nl, ref_table, ref_id
  ) VALUES (
    v_post.author_id,
    'new_comment',
    'Nouveau commentaire',
    'New comment',
    'Nieuwe reactie',
    v_commenter || ' a commenté ton post',
    v_commenter || ' commented on your post',
    v_commenter || ' heeft op je bericht gereageerd',
    'community_posts',
    NEW.post_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_new_comment ON public.community_comments;
CREATE TRIGGER trg_notify_new_comment
AFTER INSERT ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_new_comment();

-- Notif sur nouvelle réaction (groupée : 1 notif par 15 min par user/post)
CREATE OR REPLACE FUNCTION public.fn_notify_new_reaction()
RETURNS TRIGGER AS $$
DECLARE
  v_post   RECORD;
  v_recent INT;
BEGIN
  SELECT author_id INTO v_post FROM public.community_posts WHERE id = NEW.post_id;

  IF v_post.author_id IS NULL OR v_post.author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Anti-spam : si déjà une notif "new_reaction" pour ce post dans les 15 dernières min, skip
  SELECT COUNT(*) INTO v_recent
    FROM public.community_notifications
   WHERE user_id = v_post.author_id
     AND kind = 'new_reaction'
     AND ref_id = NEW.post_id
     AND created_at > NOW() - INTERVAL '15 minutes';

  IF v_recent > 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.community_notifications(
    user_id, kind, title_fr, title_en, title_nl,
    body_fr, body_en, body_nl, ref_table, ref_id
  ) VALUES (
    v_post.author_id,
    'new_reaction',
    'Réaction sur ton post',
    'Reaction on your post',
    'Reactie op je bericht',
    'Ton post reçoit des réactions',
    'Your post is getting reactions',
    'Je bericht krijgt reacties',
    'community_posts',
    NEW.post_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_new_reaction ON public.community_reactions;
CREATE TRIGGER trg_notify_new_reaction
AFTER INSERT ON public.community_reactions
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_new_reaction();

-- Notif featured story
CREATE OR REPLACE FUNCTION public.fn_notify_story_featured()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.featured = FALSE AND NEW.featured = TRUE AND NEW.author_id != COALESCE(NEW.featured_by, NEW.author_id) THEN
    INSERT INTO public.community_notifications(
      user_id, kind, title_fr, title_en, title_nl,
      body_fr, body_en, body_nl, ref_table, ref_id
    ) VALUES (
      NEW.author_id,
      'story_featured',
      'Ton coach a mis ta story en avant',
      'Your coach featured your story',
      'Je coach heeft je verhaal uitgelicht',
      'Ta transformation est désormais visible en témoignage',
      'Your transformation is now featured as a testimonial',
      'Je transformatie is nu zichtbaar als getuigenis',
      'community_stories',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_story_featured ON public.community_stories;
CREATE TRIGGER trg_notify_story_featured
AFTER UPDATE OF featured ON public.community_stories
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_story_featured();

-- Notif nouveau challenge créé par coach → tous ses clients actifs
CREATE OR REPLACE FUNCTION public.fn_notify_new_challenge()
RETURNS TRIGGER AS $$
DECLARE
  r RECORD;
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR (OLD.status != 'active' AND NEW.status = 'active')) THEN
    FOR r IN
      SELECT client_id FROM public.coach_clients
       WHERE coach_id = NEW.coach_id AND status = 'active'
    LOOP
      INSERT INTO public.community_notifications(
        user_id, kind, title_fr, title_en, title_nl,
        body_fr, body_en, body_nl, ref_table, ref_id
      ) VALUES (
        r.client_id,
        'new_challenge',
        'Nouveau challenge',
        'New challenge',
        'Nieuwe uitdaging',
        NEW.title_fr,
        NEW.title_en,
        NEW.title_nl,
        'community_challenges',
        NEW.id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_new_challenge ON public.community_challenges;
CREATE TRIGGER trg_notify_new_challenge
AFTER INSERT OR UPDATE OF status ON public.community_challenges
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_new_challenge();

-- Notif challenge complété
CREATE OR REPLACE FUNCTION public.fn_notify_challenge_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_chall RECORD;
BEGIN
  IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
    SELECT title_fr, title_en, title_nl INTO v_chall
      FROM public.community_challenges WHERE id = NEW.challenge_id;

    INSERT INTO public.community_notifications(
      user_id, kind, title_fr, title_en, title_nl,
      body_fr, body_en, body_nl, ref_table, ref_id
    ) VALUES (
      NEW.user_id,
      'challenge_completed',
      'Challenge terminé',
      'Challenge completed',
      'Uitdaging voltooid',
      'Bravo, tu as terminé : ' || v_chall.title_fr,
      'Well done, you completed: ' || v_chall.title_en,
      'Goed gedaan, je hebt voltooid: ' || v_chall.title_nl,
      'community_challenges',
      NEW.challenge_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_challenge_completed ON public.community_challenge_participants;
CREATE TRIGGER trg_notify_challenge_completed
AFTER UPDATE OF completed_at ON public.community_challenge_participants
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_challenge_completed();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.community_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cn_select ON public.community_notifications;
CREATE POLICY cn_select ON public.community_notifications
FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS cn_update ON public.community_notifications;
CREATE POLICY cn_update ON public.community_notifications
FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_notifications;
