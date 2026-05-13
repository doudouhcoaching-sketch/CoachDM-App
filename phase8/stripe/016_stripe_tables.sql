-- ============================================================
-- COACH DM — Migration Stripe (à ajouter aux 15 migrations)
-- File: supabase/migrations/016_stripe_tables.sql
-- ============================================================

-- 1. Table stripe_events (idempotency)
CREATE TABLE IF NOT EXISTS public.stripe_events (
  event_id      TEXT PRIMARY KEY,
  event_type    TEXT NOT NULL,
  payload       JSONB NOT NULL,
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON public.stripe_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_at ON public.stripe_events(processed_at DESC);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
-- Aucune politique → seul service_role peut lire/écrire (webhook only)

-- 2. Table subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id       TEXT NOT NULL,
  stripe_subscription_id   TEXT NOT NULL UNIQUE,
  stripe_price_id          TEXT NOT NULL,
  status                   TEXT NOT NULL CHECK (status IN (
    'incomplete','incomplete_expired','trialing','active',
    'past_due','canceled','unpaid','paused'
  )),
  current_period_end       TIMESTAMPTZ,
  trial_end                TIMESTAMPTZ,
  cancel_at_period_end     BOOLEAN NOT NULL DEFAULT false,
  canceled_at              TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_read_own" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Service role only for writes (via webhook)

-- 3. Table invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_invoice_id         TEXT NOT NULL UNIQUE,
  stripe_subscription_id    TEXT,
  amount_paid_cents         INTEGER NOT NULL,
  currency                  TEXT NOT NULL DEFAULT 'eur',
  status                    TEXT NOT NULL,
  hosted_invoice_url        TEXT,
  invoice_pdf               TEXT,
  paid_at                   TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_paid_at ON public.invoices(paid_at DESC);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_read_own" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);

-- 4. Ajouter colonne tier sur user_profiles si absente
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_profiles' AND column_name='tier'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD COLUMN tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','premium','coach_pro')),
      ADD COLUMN tier_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

-- 5. Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 6. Vue d'agrégation pour admin (sécurisée)
CREATE OR REPLACE VIEW public.v_subscription_stats AS
SELECT
  date_trunc('day', s.created_at) AS day,
  s.status,
  count(*) AS count,
  sum(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) AS active_count,
  sum(CASE WHEN s.status = 'trialing' THEN 1 ELSE 0 END) AS trialing_count
FROM public.subscriptions s
GROUP BY 1, 2
ORDER BY 1 DESC;

COMMENT ON TABLE public.stripe_events IS 'Idempotency Stripe webhooks. Insert one row per event_id.';
COMMENT ON TABLE public.subscriptions IS 'Source of truth abonnements. Écrit uniquement par webhook (service_role).';
COMMENT ON TABLE public.invoices IS 'Historique factures Stripe. Écrit uniquement par webhook.';
