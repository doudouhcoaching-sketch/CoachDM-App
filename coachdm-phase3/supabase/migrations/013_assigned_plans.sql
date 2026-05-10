-- ============================================================
-- Coach DM · Migration 013 · Personalized plan assignments
-- ============================================================
-- Coach assigns programs to clients (manual or templated).
-- Allows per-client customization on top of catalog programs.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. assigned_plans — coach-prescribed plans per client
-- ─────────────────────────────────────────────────────────────
create table if not exists public.assigned_plans (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references auth.users(id) on delete cascade,
  coach_user_id uuid not null references auth.users(id) on delete cascade,

  -- Optional link to a catalog program (null = fully custom plan)
  source_program_id uuid references public.programs(id) on delete set null,

  -- Trilingual content (FR priority per Coach DM standards)
  title_fr text not null,
  title_en text not null,
  title_nl text not null,
  description_fr text,
  description_en text,
  description_nl text,
  goal text not null check (goal in (
    'fat_loss', 'muscle_gain', 'strength', 'hyrox', 'crossfit',
    'general_fitness', 'rehab', 'sport_specific', 'mobility', 'custom'
  )),

  duration_weeks smallint not null check (duration_weeks between 1 and 52),
  start_date date not null,
  end_date date generated always as (start_date + (duration_weeks * 7) - 1) stored,

  status text not null default 'draft' check (status in (
    'draft', 'active', 'paused', 'completed', 'archived'
  )),

  -- Coach-specific metadata
  weekly_check_in_required boolean not null default true,
  notes_fr text,
  notes_en text,
  notes_nl text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assigned_plans_client_idx
  on public.assigned_plans(client_user_id, status);
create index if not exists assigned_plans_coach_idx
  on public.assigned_plans(coach_user_id, status);
create index if not exists assigned_plans_active_idx
  on public.assigned_plans(client_user_id, end_date)
  where status = 'active';

-- ─────────────────────────────────────────────────────────────
-- 2. assigned_plan_workouts — daily/weekly schedule
-- ─────────────────────────────────────────────────────────────
create table if not exists public.assigned_plan_workouts (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.assigned_plans(id) on delete cascade,

  week_number smallint not null check (week_number between 1 and 52),
  day_of_week smallint not null check (day_of_week between 1 and 7),

  -- Either link to catalog workout or define inline
  workout_id uuid references public.workouts(id) on delete set null,

  custom_title_fr text,
  custom_title_en text,
  custom_title_nl text,
  custom_notes_fr text,
  custom_notes_en text,
  custom_notes_nl text,

  -- Coach can override prescribed parameters
  intensity_modifier numeric(3,2) default 1.0
    check (intensity_modifier between 0.5 and 1.5),

  is_rest_day boolean not null default false,
  is_optional boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (plan_id, week_number, day_of_week)
);

create index if not exists assigned_plan_workouts_plan_idx
  on public.assigned_plan_workouts(plan_id, week_number, day_of_week);

-- ─────────────────────────────────────────────────────────────
-- 3. assigned_plan_meals — coach can prescribe meal plans
-- ─────────────────────────────────────────────────────────────
create table if not exists public.assigned_plan_meals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.assigned_plans(id) on delete cascade,

  -- Targets the coach prescribes (override base nutrition_targets)
  target_calories integer check (target_calories between 1000 and 6000),
  target_protein_g integer check (target_protein_g between 50 and 400),
  target_carbs_g integer check (target_carbs_g between 50 and 800),
  target_fat_g integer check (target_fat_g between 20 and 250),
  target_water_ml integer default 2500,

  -- Recipe rotation
  recipe_ids uuid[] default '{}',

  -- Periodization (Loughborough method)
  carb_strategy text check (carb_strategy in (
    'high_carb_training_day',
    'low_carb_rest_day',
    'cyclical',
    'flat'
  )) default 'flat',

  notes_fr text,
  notes_en text,
  notes_nl text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (plan_id)
);

-- ─────────────────────────────────────────────────────────────
-- 4. RPC: copy a catalog program into an assigned plan
-- ─────────────────────────────────────────────────────────────
create or replace function public.assign_program_to_client(
  p_client_user_id uuid,
  p_program_id uuid,
  p_start_date date default current_date,
  p_intensity_modifier numeric default 1.0
)
returns public.assigned_plans
language plpgsql security definer set search_path = public as $$
declare
  v_program public.programs%rowtype;
  v_plan public.assigned_plans%rowtype;
  v_coach_uid uuid := auth.uid();
begin
  -- Authz: caller must coach the client (or super admin)
  if not public.coaches_user(p_client_user_id, v_coach_uid) then
    raise exception 'You do not coach this client';
  end if;

  select * into v_program from public.programs where id = p_program_id;
  if v_program.id is null then
    raise exception 'Program not found';
  end if;

  insert into public.assigned_plans (
    client_user_id, coach_user_id, source_program_id,
    title_fr, title_en, title_nl,
    description_fr, description_en, description_nl,
    goal, duration_weeks, start_date, status
  )
  values (
    p_client_user_id, v_coach_uid, p_program_id,
    v_program.title_fr, v_program.title_en, v_program.title_nl,
    v_program.description_fr, v_program.description_en, v_program.description_nl,
    v_program.goal, v_program.duration_weeks, p_start_date, 'active'
  )
  returning * into v_plan;

  -- Copy all workouts from program template
  insert into public.assigned_plan_workouts (
    plan_id, week_number, day_of_week, workout_id, intensity_modifier
  )
  select
    v_plan.id,
    w.week_number,
    w.day_of_week,
    w.id,
    p_intensity_modifier
  from public.workouts w
  where w.program_id = p_program_id;

  -- Notify the client via the coach thread
  insert into public.messages (
    thread_id, sender_user_id, recipient_user_id, body, ref_type, ref_id
  )
  select
    t.id,
    v_coach_uid,
    p_client_user_id,
    format(
      '🎯 Nouveau plan assigné : %s · New plan assigned · Nieuw plan toegewezen',
      v_program.title_fr
    ),
    'program',
    v_plan.id
  from public.message_threads t
  where t.coach_user_id = v_coach_uid
    and t.client_user_id = p_client_user_id;

  return v_plan;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 5. RLS
-- ─────────────────────────────────────────────────────────────
alter table public.assigned_plans enable row level security;
alter table public.assigned_plan_workouts enable row level security;
alter table public.assigned_plan_meals enable row level security;

drop policy if exists plans_visibility on public.assigned_plans;
create policy plans_visibility on public.assigned_plans
  for select using (
    client_user_id = auth.uid()
    or coach_user_id = auth.uid()
    or public.is_super_admin()
  );

drop policy if exists plans_coach_write on public.assigned_plans;
create policy plans_coach_write on public.assigned_plans
  for all using (
    coach_user_id = auth.uid() or public.is_super_admin()
  )
  with check (
    coach_user_id = auth.uid() or public.is_super_admin()
  );

drop policy if exists plan_workouts_read on public.assigned_plan_workouts;
create policy plan_workouts_read on public.assigned_plan_workouts
  for select using (
    exists (
      select 1 from public.assigned_plans p
      where p.id = plan_id
        and (
          p.client_user_id = auth.uid()
          or p.coach_user_id = auth.uid()
          or public.is_super_admin()
        )
    )
  );

drop policy if exists plan_workouts_coach_write on public.assigned_plan_workouts;
create policy plan_workouts_coach_write on public.assigned_plan_workouts
  for all using (
    exists (
      select 1 from public.assigned_plans p
      where p.id = plan_id
        and (p.coach_user_id = auth.uid() or public.is_super_admin())
    )
  )
  with check (
    exists (
      select 1 from public.assigned_plans p
      where p.id = plan_id
        and (p.coach_user_id = auth.uid() or public.is_super_admin())
    )
  );

drop policy if exists plan_meals_read on public.assigned_plan_meals;
create policy plan_meals_read on public.assigned_plan_meals
  for select using (
    exists (
      select 1 from public.assigned_plans p
      where p.id = plan_id
        and (
          p.client_user_id = auth.uid()
          or p.coach_user_id = auth.uid()
          or public.is_super_admin()
        )
    )
  );

drop policy if exists plan_meals_coach_write on public.assigned_plan_meals;
create policy plan_meals_coach_write on public.assigned_plan_meals
  for all using (
    exists (
      select 1 from public.assigned_plans p
      where p.id = plan_id
        and (p.coach_user_id = auth.uid() or public.is_super_admin())
    )
  )
  with check (
    exists (
      select 1 from public.assigned_plans p
      where p.id = plan_id
        and (p.coach_user_id = auth.uid() or public.is_super_admin())
    )
  );

-- updated_at triggers
drop trigger if exists trg_plans_updated on public.assigned_plans;
create trigger trg_plans_updated
  before update on public.assigned_plans
  for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_plan_workouts_updated on public.assigned_plan_workouts;
create trigger trg_plan_workouts_updated
  before update on public.assigned_plan_workouts
  for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_plan_meals_updated on public.assigned_plan_meals;
create trigger trg_plan_meals_updated
  before update on public.assigned_plan_meals
  for each row execute function public.tg_set_updated_at();
