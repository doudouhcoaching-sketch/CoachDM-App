-- =====================================================================
-- COACH DM · APP · PHASE 7 — IA COACH ASSISTANT
-- Migration 015 · Base de données complète
-- Architecture : silo par coach, RLS strict, embeddings pgvector,
-- conversations + adjustments + plateau + recovery + session suggestions.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------
create extension if not exists pgvector;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type ai_role as enum ('system', 'user', 'assistant', 'tool');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_intent as enum (
    'general',
    'program_adjust',
    'plateau_check',
    'recovery_reco',
    'session_suggest',
    'nutrition_query',
    'community_summary'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_adjustment_kind as enum (
    'deload',
    'intensify',
    'swap_exercise',
    'add_volume',
    'reduce_volume',
    'change_split',
    'add_recovery'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_adjustment_status as enum ('proposed', 'accepted', 'rejected', 'applied', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_plateau_metric as enum ('strength', 'volume', 'bodyweight', 'pr_count', 'rpe_drift');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2. Conversations
-- ---------------------------------------------------------------------
create table if not exists ai_conversations (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references auth.users(id) on delete cascade,
  client_id     uuid not null references auth.users(id) on delete cascade,
  title_fr      text not null default 'Nouvelle conversation',
  title_en      text not null default 'New conversation',
  title_nl      text not null default 'Nieuw gesprek',
  intent        ai_intent not null default 'general',
  is_archived   boolean not null default false,
  last_msg_at   timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_ai_conv_coach   on ai_conversations(coach_id, last_msg_at desc);
create index if not exists idx_ai_conv_client  on ai_conversations(client_id, last_msg_at desc);
create index if not exists idx_ai_conv_intent  on ai_conversations(intent) where is_archived = false;

-- ---------------------------------------------------------------------
-- 3. Messages
-- ---------------------------------------------------------------------
create table if not exists ai_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role            ai_role not null,
  content         text not null,
  lang            text not null default 'fr' check (lang in ('fr', 'en', 'nl')),
  tool_name       text,
  tool_args       jsonb,
  tool_result     jsonb,
  tokens_in       int default 0,
  tokens_out      int default 0,
  latency_ms      int default 0,
  model           text default 'claude-sonnet-4',
  created_at      timestamptz not null default now()
);

create index if not exists idx_ai_msg_conv     on ai_messages(conversation_id, created_at);
create index if not exists idx_ai_msg_tool     on ai_messages(tool_name) where tool_name is not null;

-- Trigger : maj last_msg_at + updated_at
create or replace function fn_ai_conv_touch() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update ai_conversations
     set last_msg_at = new.created_at,
         updated_at  = now()
   where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists trg_ai_conv_touch on ai_messages;
create trigger trg_ai_conv_touch
  after insert on ai_messages
  for each row execute function fn_ai_conv_touch();

-- ---------------------------------------------------------------------
-- 4. Contexte client snapshot (cache pour le prompt assistant)
-- ---------------------------------------------------------------------
create table if not exists ai_client_context (
  client_id        uuid primary key references auth.users(id) on delete cascade,
  coach_id         uuid not null references auth.users(id) on delete cascade,
  -- Profil
  age              int,
  sex              text check (sex in ('m', 'f', 'x')),
  weight_kg        numeric(5,2),
  height_cm        numeric(5,2),
  bodyfat_pct      numeric(4,2),
  goal             text,
  experience_level text check (experience_level in ('beginner', 'intermediate', 'advanced', 'elite')),
  -- Snapshots calculés
  bmr_kcal         int,
  tdee_kcal        int,
  proteins_g       int,
  carbs_g          int,
  fats_g           int,
  -- Charges (Phase 5)
  acwr_7_28        numeric(4,2),
  weekly_volume_kg numeric(10,2),
  weekly_sessions  int,
  -- Recovery (Phase 4)
  recovery_score   int check (recovery_score between 0 and 100),
  sleep_avg_h      numeric(3,1),
  hrv_avg          numeric(5,2),
  rpe_avg_7d       numeric(3,1),
  -- PRs (Phase 2)
  pr_count_30d     int default 0,
  top_pr_summary   text,
  -- Communauté (Phase 6)
  challenge_active boolean default false,
  leaderboard_rank int,
  -- Metadata
  refreshed_at     timestamptz not null default now(),
  raw_snapshot     jsonb
);

create index if not exists idx_ai_ctx_coach on ai_client_context(coach_id);
create index if not exists idx_ai_ctx_refresh on ai_client_context(refreshed_at);

-- ---------------------------------------------------------------------
-- 5. Embeddings — recherche sémantique sur l'historique client
-- ---------------------------------------------------------------------
create table if not exists ai_embeddings (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null references auth.users(id) on delete cascade,
  client_id    uuid references auth.users(id) on delete cascade,
  source       text not null check (source in ('message', 'session_note', 'checkin', 'plateau', 'recovery_note')),
  source_id    uuid,
  content      text not null,
  embedding    vector(1536),
  created_at   timestamptz not null default now()
);

create index if not exists idx_ai_emb_client on ai_embeddings(client_id) where client_id is not null;
create index if not exists idx_ai_emb_vector on ai_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ---------------------------------------------------------------------
-- 6. Plan adjustments (suggestions IA de modification de programme)
-- ---------------------------------------------------------------------
create table if not exists ai_plan_adjustments (
  id                uuid primary key default gen_random_uuid(),
  coach_id          uuid not null references auth.users(id) on delete cascade,
  client_id         uuid not null references auth.users(id) on delete cascade,
  conversation_id   uuid references ai_conversations(id) on delete set null,
  program_id        uuid, -- ref workout_programs (Phase 2) - non-fk pour découplage défensif
  kind              ai_adjustment_kind not null,
  reason_fr         text not null,
  reason_en         text not null,
  reason_nl         text not null,
  evidence          jsonb not null, -- {acwr, prs, rpe_drift, sleep_avg, etc.}
  proposed_changes  jsonb not null, -- {exercises: [...], sets_delta: -2, intensity_pct: 0.85, ...}
  scientific_refs   text[],         -- ['Gabbett 2016', 'Issurin 2010']
  status            ai_adjustment_status not null default 'proposed',
  applied_by        uuid references auth.users(id),
  applied_at        timestamptz,
  expires_at        timestamptz not null default (now() + interval '14 days'),
  created_at        timestamptz not null default now()
);

create index if not exists idx_ai_adj_client_status on ai_plan_adjustments(client_id, status);
create index if not exists idx_ai_adj_coach on ai_plan_adjustments(coach_id, created_at desc);

-- ---------------------------------------------------------------------
-- 7. Plateau detections
-- ---------------------------------------------------------------------
create table if not exists ai_plateau_detections (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references auth.users(id) on delete cascade,
  client_id     uuid not null references auth.users(id) on delete cascade,
  metric        ai_plateau_metric not null,
  exercise_id   uuid, -- ref exercises (Phase 2)
  window_days   int not null default 28,
  baseline      numeric(10,2) not null,
  current_value numeric(10,2) not null,
  delta_pct     numeric(6,3) not null,
  confidence    numeric(3,2) not null check (confidence between 0 and 1),
  insight_fr    text not null,
  insight_en    text not null,
  insight_nl    text not null,
  recommended_action ai_adjustment_kind,
  detected_at   timestamptz not null default now(),
  resolved_at   timestamptz,
  resolved_by_adjustment_id uuid references ai_plan_adjustments(id) on delete set null
);

create index if not exists idx_ai_plateau_client on ai_plateau_detections(client_id, detected_at desc);
create index if not exists idx_ai_plateau_open on ai_plateau_detections(client_id) where resolved_at is null;

-- ---------------------------------------------------------------------
-- 8. Recovery recommendations (basé charge ACWR + sommeil + HRV)
-- ---------------------------------------------------------------------
create table if not exists ai_recovery_recos (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references auth.users(id) on delete cascade,
  client_id     uuid not null references auth.users(id) on delete cascade,
  date          date not null default current_date,
  acwr          numeric(4,2),
  sleep_h       numeric(3,1),
  hrv           numeric(5,2),
  rpe_yesterday numeric(3,1),
  -- Score 0-100
  readiness     int not null check (readiness between 0 and 100),
  zone          text not null check (zone in ('green', 'amber', 'red')),
  recommendation_fr text not null,
  recommendation_en text not null,
  recommendation_nl text not null,
  protocol      jsonb not null, -- {sleep_target_h, mobility_min, ice_bath, etc.}
  scientific_refs text[],
  created_at    timestamptz not null default now(),
  unique (client_id, date)
);

create index if not exists idx_ai_reco_coach on ai_recovery_recos(coach_id, date desc);
create index if not exists idx_ai_reco_client on ai_recovery_recos(client_id, date desc);

-- ---------------------------------------------------------------------
-- 9. Session suggestions (séance du jour adaptée)
-- ---------------------------------------------------------------------
create table if not exists ai_session_suggestions (
  id              uuid primary key default gen_random_uuid(),
  coach_id        uuid not null references auth.users(id) on delete cascade,
  client_id       uuid not null references auth.users(id) on delete cascade,
  date            date not null default current_date,
  readiness       int not null,
  zone            text not null check (zone in ('green', 'amber', 'red')),
  suggested_kind  text not null, -- 'strength', 'conditioning', 'mobility', 'rest', 'tactical'
  title_fr        text not null,
  title_en        text not null,
  title_nl        text not null,
  duration_min    int not null,
  rpe_target      numeric(3,1),
  exercises       jsonb not null, -- [{exercise_id, sets, reps, rest_s, intensity_pct, notes_fr/en/nl}]
  rationale_fr    text not null,
  rationale_en    text not null,
  rationale_nl    text not null,
  scientific_refs text[],
  accepted        boolean,
  accepted_at     timestamptz,
  created_at      timestamptz not null default now(),
  unique (client_id, date)
);

create index if not exists idx_ai_sugg_coach on ai_session_suggestions(coach_id, date desc);
create index if not exists idx_ai_sugg_client on ai_session_suggestions(client_id, date desc);

-- ---------------------------------------------------------------------
-- 10. Tokens usage (cost tracking par coach)
-- ---------------------------------------------------------------------
create table if not exists ai_usage_daily (
  coach_id      uuid not null references auth.users(id) on delete cascade,
  date          date not null default current_date,
  tokens_in     bigint not null default 0,
  tokens_out    bigint not null default 0,
  requests      int not null default 0,
  cost_eur      numeric(10,4) not null default 0,
  primary key (coach_id, date)
);

-- ---------------------------------------------------------------------
-- 11. RLS — silo par coach strict
-- ---------------------------------------------------------------------
alter table ai_conversations         enable row level security;
alter table ai_messages              enable row level security;
alter table ai_client_context        enable row level security;
alter table ai_embeddings            enable row level security;
alter table ai_plan_adjustments      enable row level security;
alter table ai_plateau_detections    enable row level security;
alter table ai_recovery_recos        enable row level security;
alter table ai_session_suggestions   enable row level security;
alter table ai_usage_daily           enable row level security;

-- Coach voit tout pour ses clients ; client voit ses propres données.
-- On suppose une table coach_clients (Phase 3) ; sinon fallback sur client_id = auth.uid().

create or replace function fn_ai_is_coach_of(p_client uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from information_schema.tables
     where table_name = 'coach_clients' and table_schema = 'public'
  )
  and exists (
    select 1 from coach_clients cc
     where cc.coach_id = auth.uid() and cc.client_id = p_client and cc.is_active = true
  );
$$;

-- ai_conversations
drop policy if exists pol_ai_conv_select on ai_conversations;
create policy pol_ai_conv_select on ai_conversations for select
  using (coach_id = auth.uid() or client_id = auth.uid());

drop policy if exists pol_ai_conv_insert on ai_conversations;
create policy pol_ai_conv_insert on ai_conversations for insert
  with check (coach_id = auth.uid() or client_id = auth.uid());

drop policy if exists pol_ai_conv_update on ai_conversations;
create policy pol_ai_conv_update on ai_conversations for update
  using (coach_id = auth.uid() or client_id = auth.uid());

-- ai_messages
drop policy if exists pol_ai_msg_select on ai_messages;
create policy pol_ai_msg_select on ai_messages for select
  using (exists (
    select 1 from ai_conversations c
     where c.id = ai_messages.conversation_id
       and (c.coach_id = auth.uid() or c.client_id = auth.uid())
  ));

drop policy if exists pol_ai_msg_insert on ai_messages;
create policy pol_ai_msg_insert on ai_messages for insert
  with check (exists (
    select 1 from ai_conversations c
     where c.id = ai_messages.conversation_id
       and (c.coach_id = auth.uid() or c.client_id = auth.uid())
  ));

-- ai_client_context : lecture coach + client lui-même
drop policy if exists pol_ai_ctx_select on ai_client_context;
create policy pol_ai_ctx_select on ai_client_context for select
  using (coach_id = auth.uid() or client_id = auth.uid());

drop policy if exists pol_ai_ctx_upsert on ai_client_context;
create policy pol_ai_ctx_upsert on ai_client_context for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- ai_embeddings : coach uniquement (jamais exposé au client brut)
drop policy if exists pol_ai_emb_coach on ai_embeddings;
create policy pol_ai_emb_coach on ai_embeddings for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- ai_plan_adjustments
drop policy if exists pol_ai_adj_select on ai_plan_adjustments;
create policy pol_ai_adj_select on ai_plan_adjustments for select
  using (coach_id = auth.uid() or client_id = auth.uid());

drop policy if exists pol_ai_adj_coach_write on ai_plan_adjustments;
create policy pol_ai_adj_coach_write on ai_plan_adjustments for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- ai_plateau_detections
drop policy if exists pol_ai_plat_select on ai_plateau_detections;
create policy pol_ai_plat_select on ai_plateau_detections for select
  using (coach_id = auth.uid() or client_id = auth.uid());

drop policy if exists pol_ai_plat_coach_write on ai_plateau_detections;
create policy pol_ai_plat_coach_write on ai_plateau_detections for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- ai_recovery_recos
drop policy if exists pol_ai_reco_select on ai_recovery_recos;
create policy pol_ai_reco_select on ai_recovery_recos for select
  using (coach_id = auth.uid() or client_id = auth.uid());

drop policy if exists pol_ai_reco_coach_write on ai_recovery_recos;
create policy pol_ai_reco_coach_write on ai_recovery_recos for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- ai_session_suggestions
drop policy if exists pol_ai_sugg_select on ai_session_suggestions;
create policy pol_ai_sugg_select on ai_session_suggestions for select
  using (coach_id = auth.uid() or client_id = auth.uid());

drop policy if exists pol_ai_sugg_coach_write on ai_session_suggestions;
create policy pol_ai_sugg_coach_write on ai_session_suggestions for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

drop policy if exists pol_ai_sugg_client_accept on ai_session_suggestions;
create policy pol_ai_sugg_client_accept on ai_session_suggestions for update
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- ai_usage_daily : coach uniquement
drop policy if exists pol_ai_usage_coach on ai_usage_daily;
create policy pol_ai_usage_coach on ai_usage_daily for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- ---------------------------------------------------------------------
-- 12. Computations défensives (vérifient existence des tables Phase 2/4/5)
-- ---------------------------------------------------------------------

-- Calcule l'ACWR 7:28 si Phase 5 disponible, null sinon
create or replace function fn_ai_acwr_safe(p_client uuid)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare
  v_acute numeric; v_chronic numeric;
begin
  if not exists (select 1 from information_schema.tables where table_name = 'analytics_load' and table_schema = 'public') then
    return null;
  end if;
  execute format($q$
    select coalesce(sum(rpe * duration_min) filter (where date >= current_date - 7), 0)::numeric / 7,
           coalesce(sum(rpe * duration_min) filter (where date >= current_date - 28), 0)::numeric / 28
      from analytics_load where client_id = %L
  $q$, p_client) into v_acute, v_chronic;
  if v_chronic = 0 then return null; end if;
  return round(v_acute / v_chronic, 2);
end $$;

-- Snapshot recovery score (Phase 4)
create or replace function fn_ai_recovery_safe(p_client uuid)
returns table(score int, sleep_h numeric, hrv numeric, rpe_avg numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from information_schema.tables where table_name = 'recovery_daily' and table_schema = 'public') then
    return query select null::int, null::numeric, null::numeric, null::numeric;
    return;
  end if;
  return query execute format($q$
    select recovery_score::int,
           sleep_hours::numeric,
           hrv_rmssd::numeric,
           rpe_session::numeric
      from recovery_daily
     where client_id = %L and date >= current_date - 7
  order by date desc limit 1
  $q$, p_client);
end $$;

-- Compte PRs des 30 derniers jours (Phase 2)
create or replace function fn_ai_pr_count_safe(p_client uuid)
returns int language plpgsql stable security definer set search_path = public as $$
declare v_count int;
begin
  if not exists (select 1 from information_schema.tables where table_name = 'personal_records' and table_schema = 'public') then
    return 0;
  end if;
  execute format($q$
    select count(*)::int from personal_records
     where client_id = %L and achieved_at >= now() - interval '30 days'
  $q$, p_client) into v_count;
  return coalesce(v_count, 0);
end $$;

-- ---------------------------------------------------------------------
-- 13. Refresh client context (one-shot, appelé par Edge Function)
-- ---------------------------------------------------------------------
create or replace function fn_ai_refresh_context(p_client uuid, p_coach uuid)
returns ai_client_context language plpgsql security definer set search_path = public as $$
declare
  v_recovery record;
  v_row ai_client_context;
begin
  select * into v_recovery from fn_ai_recovery_safe(p_client);

  insert into ai_client_context (
    client_id, coach_id, acwr_7_28, recovery_score, sleep_avg_h, hrv_avg, rpe_avg_7d,
    pr_count_30d, refreshed_at
  ) values (
    p_client, p_coach, fn_ai_acwr_safe(p_client),
    v_recovery.score, v_recovery.sleep_h, v_recovery.hrv, v_recovery.rpe_avg,
    fn_ai_pr_count_safe(p_client), now()
  )
  on conflict (client_id) do update set
    coach_id        = excluded.coach_id,
    acwr_7_28       = excluded.acwr_7_28,
    recovery_score  = excluded.recovery_score,
    sleep_avg_h     = excluded.sleep_avg_h,
    hrv_avg         = excluded.hrv_avg,
    rpe_avg_7d      = excluded.rpe_avg_7d,
    pr_count_30d    = excluded.pr_count_30d,
    refreshed_at    = now()
  returning * into v_row;

  return v_row;
end $$;

-- ---------------------------------------------------------------------
-- 14. Cron jobs (refresh + scan plateau)
-- ---------------------------------------------------------------------
do $$ begin
  perform cron.schedule(
    'ai-context-refresh-nightly',
    '15 3 * * *',
    $$select fn_ai_refresh_context(client_id, coach_id) from ai_client_context$$
  );
exception when others then null; end $$;

do $$ begin
  perform cron.schedule(
    'ai-plateau-scan-daily',
    '30 4 * * *',
    $$select net.http_post(
        url := current_setting('app.functions_url') || '/ai-plateau-scan',
        headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.cron_token')),
        body := '{}'::jsonb
      )$$
  );
exception when others then null; end $$;

-- ---------------------------------------------------------------------
-- 15. Audit
-- ---------------------------------------------------------------------
comment on table ai_conversations        is 'Phase 7 — Conversations IA coach/client';
comment on table ai_messages             is 'Phase 7 — Messages (user/assistant/tool) avec tokens et latence';
comment on table ai_client_context       is 'Phase 7 — Snapshot calculé pour prompt (rafraîchi nightly)';
comment on table ai_embeddings           is 'Phase 7 — Embeddings 1536d pour RAG sur historique client';
comment on table ai_plan_adjustments     is 'Phase 7 — Suggestions IA de modification de programme';
comment on table ai_plateau_detections   is 'Phase 7 — Détections de plateau (Phase 5 computePlateauDetection)';
comment on table ai_recovery_recos       is 'Phase 7 — Recommandations recovery basées ACWR + HRV';
comment on table ai_session_suggestions  is 'Phase 7 — Séance du jour adaptée fatigue/sommeil';
comment on table ai_usage_daily          is 'Phase 7 — Cost tracking tokens par coach';

-- =====================================================================
-- FIN Migration 015 · Phase 7 IA Coach Assistant
-- =====================================================================
