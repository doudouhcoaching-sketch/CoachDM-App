-- ============================================================
-- Coach DM · Migration 010 · Coach roles & client assignments
-- ============================================================
-- Establishes the multi-coach foundation:
--   1. coach_profiles      — extends profiles with coach metadata
--   2. coach_subscriptions — tracks coach access (paid/free/comp)
--   3. coach_clients       — many-to-many coach ↔ client links
--   4. helper functions    — is_super_admin(), is_coach(), coaches_user()
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Add role column to profiles
-- ─────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'role'
  ) then
    alter table public.profiles
      add column role text not null default 'client'
        check (role in ('client', 'coach', 'super_admin'));
  end if;
end $$;

create index if not exists profiles_role_idx on public.profiles(role);

-- Bootstrap super admin (Coach DM himself) — replace email if needed
update public.profiles
set role = 'super_admin'
where email = 'doudouh@coachdm.be';

-- ─────────────────────────────────────────────────────────────
-- 2. coach_profiles — public-facing coach metadata
-- ─────────────────────────────────────────────────────────────
create table if not exists public.coach_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  bio_fr text,
  bio_en text,
  bio_nl text,
  certifications text[] default '{}',
  specialties text[] default '{}',
  avatar_url text,
  city text,
  country text default 'BE',
  is_active boolean not null default true,
  max_clients integer default 50 check (max_clients > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coach_profiles_active_idx
  on public.coach_profiles(is_active) where is_active = true;

-- ─────────────────────────────────────────────────────────────
-- 3. coach_subscriptions — billing for coach access
-- ─────────────────────────────────────────────────────────────
create table if not exists public.coach_subscriptions (
  id uuid primary key default gen_random_uuid(),
  coach_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in (
    'trial', 'active', 'past_due', 'canceled', 'comp', 'free'
  )),
  plan text not null default 'coach_pro' check (plan in (
    'coach_pro', 'coach_pro_annual', 'comp', 'free'
  )),
  -- Stripe linkage (null for comp/free coaches)
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  granted_by uuid references auth.users(id),  -- super_admin who granted comp/free
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coach_user_id)
);

create index if not exists coach_subs_status_idx
  on public.coach_subscriptions(status);
create index if not exists coach_subs_period_end_idx
  on public.coach_subscriptions(current_period_end);

-- ─────────────────────────────────────────────────────────────
-- 4. coach_clients — assignment table
-- ─────────────────────────────────────────────────────────────
create table if not exists public.coach_clients (
  id uuid primary key default gen_random_uuid(),
  coach_user_id uuid not null references auth.users(id) on delete cascade,
  client_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in (
    'pending', 'active', 'paused', 'archived'
  )),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text,  -- private coach notes about the client
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coach_user_id, client_user_id),
  check (coach_user_id <> client_user_id)
);

create index if not exists coach_clients_coach_idx
  on public.coach_clients(coach_user_id, status);
create index if not exists coach_clients_client_idx
  on public.coach_clients(client_user_id, status);

-- ─────────────────────────────────────────────────────────────
-- 5. Helper functions (used in RLS policies everywhere)
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_super_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role = 'super_admin'
  );
$$;

create or replace function public.is_coach(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role in ('coach', 'super_admin')
  );
$$;

-- Returns true if `coach_uid` actively coaches `client_uid`
create or replace function public.coaches_user(client_uid uuid, coach_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin(coach_uid)
    or exists (
      select 1 from public.coach_clients
      where coach_user_id = coach_uid
        and client_user_id = client_uid
        and status = 'active'
    );
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. RLS policies
-- ─────────────────────────────────────────────────────────────
alter table public.coach_profiles enable row level security;
alter table public.coach_subscriptions enable row level security;
alter table public.coach_clients enable row level security;

-- coach_profiles: public read for active coaches, owner edits, admin all
drop policy if exists coach_profiles_read_public on public.coach_profiles;
create policy coach_profiles_read_public on public.coach_profiles
  for select using (is_active = true or user_id = auth.uid() or public.is_super_admin());

drop policy if exists coach_profiles_self_edit on public.coach_profiles;
create policy coach_profiles_self_edit on public.coach_profiles
  for update using (user_id = auth.uid() or public.is_super_admin())
  with check (user_id = auth.uid() or public.is_super_admin());

drop policy if exists coach_profiles_admin_insert on public.coach_profiles;
create policy coach_profiles_admin_insert on public.coach_profiles
  for insert with check (user_id = auth.uid() or public.is_super_admin());

drop policy if exists coach_profiles_admin_delete on public.coach_profiles;
create policy coach_profiles_admin_delete on public.coach_profiles
  for delete using (public.is_super_admin());

-- coach_subscriptions: coach reads own, super_admin all
drop policy if exists coach_subs_self_read on public.coach_subscriptions;
create policy coach_subs_self_read on public.coach_subscriptions
  for select using (coach_user_id = auth.uid() or public.is_super_admin());

drop policy if exists coach_subs_admin_write on public.coach_subscriptions;
create policy coach_subs_admin_write on public.coach_subscriptions
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- coach_clients: coach sees own assignments, client sees own coaches, admin all
drop policy if exists coach_clients_visibility on public.coach_clients;
create policy coach_clients_visibility on public.coach_clients
  for select using (
    coach_user_id = auth.uid()
    or client_user_id = auth.uid()
    or public.is_super_admin()
  );

drop policy if exists coach_clients_coach_manage on public.coach_clients;
create policy coach_clients_coach_manage on public.coach_clients
  for all using (
    coach_user_id = auth.uid() or public.is_super_admin()
  )
  with check (
    coach_user_id = auth.uid() or public.is_super_admin()
  );

-- ─────────────────────────────────────────────────────────────
-- 7. updated_at triggers
-- ─────────────────────────────────────────────────────────────
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_coach_profiles_updated on public.coach_profiles;
create trigger trg_coach_profiles_updated
  before update on public.coach_profiles
  for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_coach_subs_updated on public.coach_subscriptions;
create trigger trg_coach_subs_updated
  before update on public.coach_subscriptions
  for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_coach_clients_updated on public.coach_clients;
create trigger trg_coach_clients_updated
  before update on public.coach_clients
  for each row execute function public.tg_set_updated_at();
