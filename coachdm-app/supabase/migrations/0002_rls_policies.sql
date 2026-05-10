-- ═══════════════════════════════════════════════════════════════
-- COACH DM — Migration 0002 : Row Level Security (RLS)
-- Chaque user voit uniquement SES données. Coach voit ses clients.
-- ═══════════════════════════════════════════════════════════════

-- ── Activer RLS sur toutes les tables sensibles ──
alter table public.profiles enable row level security;
alter table public.nutrition_targets enable row level security;
alter table public.foods enable row level security;
alter table public.food_logs enable row level security;
alter table public.water_logs enable row level security;
alter table public.weight_logs enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.subscriptions enable row level security;

-- ═══════════════════════════════════════════════════════════════
-- HELPERS
-- ═══════════════════════════════════════════════════════════════

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_coach()
returns boolean
language sql
stable
security definer
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role in ('coach', 'admin')
  );
$$;

-- ═══════════════════════════════════════════════════════════════
-- PROFILES
-- ═══════════════════════════════════════════════════════════════

-- Lire son propre profil
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Le coach lit les profils de ses clients
create policy "profiles_select_coach_clients"
  on public.profiles for select
  using (coach_id = auth.uid() or public.is_admin());

-- Mettre à jour son propre profil (sauf le rôle)
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

-- Admin peut tout
create policy "profiles_admin_all"
  on public.profiles for all
  using (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- NUTRITION TARGETS
-- ═══════════════════════════════════════════════════════════════

create policy "nutrition_targets_own_all"
  on public.nutrition_targets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "nutrition_targets_coach_read"
  on public.nutrition_targets for select
  using (
    exists(
      select 1 from public.profiles
      where id = nutrition_targets.user_id and coach_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- FOODS
-- ═══════════════════════════════════════════════════════════════

-- Tout le monde peut lire les foods publiques (catalogue + verified)
create policy "foods_select_public"
  on public.foods for select
  using (is_custom = false or is_verified = true);

-- Lire ses propres foods custom
create policy "foods_select_own_custom"
  on public.foods for select
  using (auth.uid() = created_by);

-- Créer ses propres foods custom
create policy "foods_insert_own_custom"
  on public.foods for insert
  with check (auth.uid() = created_by and is_custom = true and is_verified = false);

-- Modifier ses propres foods custom (non verifiées)
create policy "foods_update_own_custom"
  on public.foods for update
  using (auth.uid() = created_by and is_verified = false);

-- Coach/admin peuvent tout
create policy "foods_coach_all"
  on public.foods for all
  using (public.is_coach());

-- ═══════════════════════════════════════════════════════════════
-- FOOD LOGS
-- ═══════════════════════════════════════════════════════════════

create policy "food_logs_own_all"
  on public.food_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "food_logs_coach_read"
  on public.food_logs for select
  using (
    exists(
      select 1 from public.profiles
      where id = food_logs.user_id and coach_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- WATER LOGS
-- ═══════════════════════════════════════════════════════════════

create policy "water_logs_own_all"
  on public.water_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "water_logs_coach_read"
  on public.water_logs for select
  using (
    exists(
      select 1 from public.profiles
      where id = water_logs.user_id and coach_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- WEIGHT LOGS
-- ═══════════════════════════════════════════════════════════════

create policy "weight_logs_own_all"
  on public.weight_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "weight_logs_coach_read"
  on public.weight_logs for select
  using (
    exists(
      select 1 from public.profiles
      where id = weight_logs.user_id and coach_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- RECIPES
-- ═══════════════════════════════════════════════════════════════

create policy "recipes_select_published"
  on public.recipes for select
  using (is_published = true);

create policy "recipes_select_own"
  on public.recipes for select
  using (auth.uid() = created_by);

create policy "recipes_coach_all"
  on public.recipes for all
  using (public.is_coach());

create policy "recipe_ingredients_select"
  on public.recipe_ingredients for select
  using (
    exists(
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and (r.is_published = true or r.created_by = auth.uid() or public.is_coach())
    )
  );

create policy "recipe_ingredients_coach_all"
  on public.recipe_ingredients for all
  using (public.is_coach());

-- ═══════════════════════════════════════════════════════════════
-- SUBSCRIPTIONS
-- ═══════════════════════════════════════════════════════════════

-- Lecture seule pour le user (jamais d'écriture côté client — uniquement webhook Stripe via service_role)
create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "subscriptions_admin_all"
  on public.subscriptions for all
  using (public.is_admin());
