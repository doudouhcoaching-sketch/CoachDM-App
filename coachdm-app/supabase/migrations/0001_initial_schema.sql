-- ═══════════════════════════════════════════════════════════════
-- COACH DM — Migration 0001 : Schéma initial
-- Phase 1 (Nutrition) + foundations (auth, profils, abonnements)
-- ═══════════════════════════════════════════════════════════════

-- ── Extensions ─────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ═══════════════════════════════════════════════════════════════
-- TYPES ENUMS
-- ═══════════════════════════════════════════════════════════════

create type user_role as enum ('client', 'coach', 'admin');
create type biological_sex as enum ('male', 'female');
create type activity_level as enum (
  'sedentary',      -- Bureau, peu d'activité (×1.2)
  'light',          -- 1-3 séances/semaine (×1.375)
  'moderate',       -- 3-5 séances/semaine (×1.55)
  'active',         -- 6-7 séances/semaine (×1.725)
  'very_active'     -- Athlète, 2× / jour (×1.9)
);
create type nutrition_goal as enum ('lose_fat', 'maintain', 'build_muscle', 'recomp');
create type meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout');
create type subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'paused');
create type locale_code as enum ('fr', 'en', 'nl');
create type unit_system as enum ('metric', 'imperial');

-- ═══════════════════════════════════════════════════════════════
-- TABLE : profiles (étend auth.users de Supabase)
-- ═══════════════════════════════════════════════════════════════

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role user_role not null default 'client',
  locale locale_code not null default 'fr',
  unit_system unit_system not null default 'metric',
  
  -- Données biométriques
  date_of_birth date,
  sex biological_sex,
  height_cm numeric(5,2) check (height_cm > 0 and height_cm < 300),
  
  -- Onboarding
  onboarding_completed boolean not null default false,
  
  -- Coach assigné (pour future Phase 3 messagerie)
  coach_id uuid references public.profiles(id) on delete set null,
  
  -- Métadonnées
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_role on public.profiles(role);
create index idx_profiles_coach_id on public.profiles(coach_id) where coach_id is not null;

-- Trigger : créer un profil automatiquement à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, locale)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'locale')::locale_code, 'fr')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger : updated_at automatique
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- TABLE : nutrition_targets (objectifs macros calculés)
-- ═══════════════════════════════════════════════════════════════

create table public.nutrition_targets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  
  -- Données utilisées pour le calcul
  current_weight_kg numeric(5,2) not null check (current_weight_kg > 0),
  target_weight_kg numeric(5,2) check (target_weight_kg > 0),
  body_fat_percentage numeric(4,2) check (body_fat_percentage between 3 and 60),
  activity_level activity_level not null,
  goal nutrition_goal not null,
  
  -- Résultats du calcul (stockés pour historique)
  bmr_kcal integer not null,                 -- Métabolisme de base (Mifflin-St Jeor)
  tdee_kcal integer not null,                -- Dépense énergétique totale
  daily_calories_kcal integer not null,      -- Cible quotidienne
  
  -- Macros cibles (en grammes)
  protein_g numeric(5,1) not null,
  carbs_g numeric(5,1) not null,
  fat_g numeric(5,1) not null,
  fiber_g numeric(5,1) not null default 30,
  
  -- Hydratation cible (ml)
  water_ml integer not null default 2500,
  
  -- État
  is_active boolean not null default true,
  calculation_method text not null default 'mifflin_st_jeor',
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_nutrition_targets_user_active 
  on public.nutrition_targets(user_id) where is_active = true;

create trigger nutrition_targets_updated_at
  before update on public.nutrition_targets
  for each row execute function public.set_updated_at();

-- Un seul target actif par user (contrainte logicielle via app)
create unique index idx_one_active_target_per_user 
  on public.nutrition_targets(user_id) where is_active = true;

-- ═══════════════════════════════════════════════════════════════
-- TABLE : foods (catalogue aliments — perso + cache OpenFoodFacts)
-- ═══════════════════════════════════════════════════════════════

create table public.foods (
  id uuid primary key default uuid_generate_v4(),
  
  -- Identifiants
  barcode text unique,                       -- Code-barres EAN/UPC
  off_id text unique,                        -- ID OpenFoodFacts (cache)
  
  -- Identité (trilingue)
  name_fr text not null,
  name_en text,
  name_nl text,
  brand text,
  
  -- Valeurs nutritionnelles pour 100g (standard OFF)
  kcal_per_100g numeric(6,2) not null check (kcal_per_100g >= 0),
  protein_per_100g numeric(5,2) not null default 0 check (protein_per_100g >= 0),
  carbs_per_100g numeric(5,2) not null default 0 check (carbs_per_100g >= 0),
  sugars_per_100g numeric(5,2) check (sugars_per_100g >= 0),
  fat_per_100g numeric(5,2) not null default 0 check (fat_per_100g >= 0),
  saturated_fat_per_100g numeric(5,2) check (saturated_fat_per_100g >= 0),
  fiber_per_100g numeric(5,2) check (fiber_per_100g >= 0),
  salt_per_100g numeric(5,2) check (salt_per_100g >= 0),
  
  -- Portion par défaut (utile pour les UI rapides)
  default_serving_g numeric(6,2),
  default_serving_label_fr text,
  default_serving_label_en text,
  default_serving_label_nl text,
  
  -- Image
  image_url text,
  
  -- Provenance
  is_custom boolean not null default false,         -- Créé par un user
  is_verified boolean not null default false,       -- Validé par coach
  created_by uuid references public.profiles(id) on delete set null,
  
  -- Recherche
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name_fr, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(name_en, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(name_nl, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(brand, '')), 'C')
  ) stored,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_foods_barcode on public.foods(barcode);
create index idx_foods_search on public.foods using gin(search_vector);
create index idx_foods_brand on public.foods(brand);
create index idx_foods_custom_creator on public.foods(created_by) where is_custom = true;

create trigger foods_updated_at
  before update on public.foods
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- TABLE : food_logs (historique des repas)
-- ═══════════════════════════════════════════════════════════════

create table public.food_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete restrict,
  
  -- Quand
  logged_date date not null,
  logged_at timestamptz not null default now(),
  meal_type meal_type not null,
  
  -- Quantité
  quantity_g numeric(7,2) not null check (quantity_g > 0),
  
  -- Snapshot des valeurs nutritionnelles au moment du log
  -- (immutables, garantit l'historique fiable même si la food change)
  kcal numeric(7,2) not null,
  protein_g numeric(6,2) not null,
  carbs_g numeric(6,2) not null,
  fat_g numeric(6,2) not null,
  fiber_g numeric(6,2) not null default 0,
  
  notes text,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_food_logs_user_date on public.food_logs(user_id, logged_date desc);
create index idx_food_logs_food on public.food_logs(food_id);

create trigger food_logs_updated_at
  before update on public.food_logs
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- TABLE : water_logs (hydratation)
-- ═══════════════════════════════════════════════════════════════

create table public.water_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  logged_date date not null,
  logged_at timestamptz not null default now(),
  amount_ml integer not null check (amount_ml > 0 and amount_ml < 5000),
  created_at timestamptz not null default now()
);

create index idx_water_logs_user_date on public.water_logs(user_id, logged_date desc);

-- ═══════════════════════════════════════════════════════════════
-- TABLE : weight_logs (suivi poids)
-- ═══════════════════════════════════════════════════════════════

create table public.weight_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  logged_date date not null,
  weight_kg numeric(5,2) not null check (weight_kg > 0 and weight_kg < 500),
  body_fat_percentage numeric(4,2) check (body_fat_percentage between 3 and 60),
  notes text,
  photo_url text,                            -- Photo de progression (privée)
  created_at timestamptz not null default now()
);

create unique index idx_weight_logs_user_date on public.weight_logs(user_id, logged_date);

-- ═══════════════════════════════════════════════════════════════
-- TABLE : recipes (recettes — futures, structure prête)
-- ═══════════════════════════════════════════════════════════════

create table public.recipes (
  id uuid primary key default uuid_generate_v4(),
  
  name_fr text not null,
  name_en text,
  name_nl text,
  description_fr text,
  description_en text,
  description_nl text,
  
  servings integer not null default 1 check (servings > 0),
  prep_time_min integer,
  cook_time_min integer,
  
  -- Macros calculées par portion
  kcal_per_serving numeric(6,2),
  protein_per_serving numeric(5,2),
  carbs_per_serving numeric(5,2),
  fat_per_serving numeric(5,2),
  
  image_url text,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger recipes_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

create table public.recipe_ingredients (
  id uuid primary key default uuid_generate_v4(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete restrict,
  quantity_g numeric(7,2) not null check (quantity_g > 0),
  display_order integer not null default 0
);

create index idx_recipe_ingredients_recipe on public.recipe_ingredients(recipe_id);

-- ═══════════════════════════════════════════════════════════════
-- TABLE : subscriptions (Stripe + RevenueCat)
-- ═══════════════════════════════════════════════════════════════

create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  
  -- Stripe (web)
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  
  -- RevenueCat (mobile, wrap App Store / Play Store)
  revenuecat_user_id text unique,
  
  -- État
  status subscription_status not null default 'incomplete',
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  
  -- Tarification
  amount_cents integer,                      -- 1999 pour 19,99€
  currency text default 'eur',
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_subscriptions_status on public.subscriptions(status);
create index idx_subscriptions_stripe_customer on public.subscriptions(stripe_customer_id);

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Helper : abonnement actif ?
create or replace function public.has_active_subscription(p_user_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists(
    select 1 from public.subscriptions
    where user_id = p_user_id
      and status in ('trialing', 'active')
      and (current_period_end is null or current_period_end > now())
  );
$$;
