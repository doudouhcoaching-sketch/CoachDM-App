-- ============================================================================
-- COACH DM — Migration 008 : Workouts schema (Phase 2)
-- ============================================================================
-- Aligned with the 22 PDF programs sold on coachdm.be:
-- Fat Burner, Body Transformation, Summer Body Burn, Shred, Strength Cycle,
-- Core Master, Mind & Body, Bulletproof Body, Functional Open Prep, Hyrox Race,
-- Gymnastics Skills, Olympic Lifting, Hyrox Foundation, Functional Performance,
-- Compete Ready, Football Performance, Endurance Athlete, Athlete Mind,
-- Explosive Power, Bodyweight Warrior, Holiday Fit, Custom.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------

create type workout_goal as enum (
  'fat_loss',          -- Perte de poids
  'strength',          -- Force
  'functional',        -- Fitness fonctionnel
  'sport',             -- Sport (foot, endurance, athlétique)
  'travel_home',       -- Voyage / maison
  'mobility',          -- Mobilité / récup
  'custom'             -- Programme sur mesure
);

create type movement_pattern as enum (
  'squat',
  'hinge',
  'lunge',
  'horizontal_push',
  'horizontal_pull',
  'vertical_push',
  'vertical_pull',
  'carry',
  'rotation',
  'core',
  'gait',              -- run, sprint, sled
  'jump',              -- plyo
  'olympic',           -- snatch, clean, jerk
  'gymnastics',        -- muscle-up, hspu, t2b, handstand
  'mobility'
);

create type exercise_modality as enum (
  'barbell',
  'dumbbell',
  'kettlebell',
  'machine',
  'cable',
  'bodyweight',
  'resistance_band',
  'sled',
  'rower',
  'bike',
  'ski_erg',
  'run',
  'medball',
  'box',
  'rings',
  'pull_up_bar',
  'sandbag',
  'wall_ball'
);

create type exercise_difficulty as enum ('beginner', 'intermediate', 'advanced', 'rx');

create type set_type as enum (
  'work',              -- série de travail
  'warmup',            -- échauffement
  'amrap',             -- as many reps as possible
  'emom',              -- every minute on the minute
  'tabata',            -- 20s on / 10s off
  'cluster',           -- cluster set
  'drop',              -- drop set
  'pyramid',
  'metcon',            -- metabolic conditioning round
  'time'               -- timed effort (e.g. plank, run, row)
);

create type session_status as enum ('scheduled', 'in_progress', 'completed', 'skipped');

-- ----------------------------------------------------------------------------
-- exercises — banque centrale (~120+ mouvements)
-- ----------------------------------------------------------------------------

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                         -- 'back-squat', 'kb-swing'
  name_fr text not null,
  name_en text not null,
  name_nl text not null,
  pattern movement_pattern not null,
  modality exercise_modality not null,
  difficulty exercise_difficulty not null default 'intermediate',
  primary_muscles text[] not null default '{}',      -- ['quadriceps','glutes']
  secondary_muscles text[] not null default '{}',
  goals workout_goal[] not null default '{}',        -- programmes compatibles
  cues_fr text not null,                             -- coaching cues FR
  cues_en text not null,
  cues_nl text not null,
  tip_color text check (tip_color in ('green','red','blue','violet')) default 'blue',
  tip_fr text,                                       -- science-based tip
  tip_en text,
  tip_nl text,
  reference_citation text,                           -- 'Schoenfeld 2010'
  video_url text,                                    -- YouTube Coach DM
  thumbnail_url text,
  default_tempo text,                                -- '3-1-1-0'
  is_unilateral boolean default false,
  requires_spotter boolean default false,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index idx_exercises_pattern on public.exercises(pattern);
create index idx_exercises_modality on public.exercises(modality);
create index idx_exercises_goals on public.exercises using gin(goals);
create index idx_exercises_slug on public.exercises(slug);

-- ----------------------------------------------------------------------------
-- programs — un programme = un PDF du site (Fat Burner 10W, Hyrox Race 12W…)
-- ----------------------------------------------------------------------------

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                         -- 'fat-burner-10w'
  title_fr text not null,
  title_en text not null,
  title_nl text not null,
  goal workout_goal not null,
  duration_weeks int not null check (duration_weeks > 0),
  sessions_per_week int not null check (sessions_per_week between 1 and 7),
  description_fr text,
  description_en text,
  description_nl text,
  cover_image_url text,
  difficulty exercise_difficulty not null default 'intermediate',
  is_recommended boolean default false,              -- ⭐ flag
  is_premium boolean default true,                   -- accessible aux abonnés
  payhip_url text,                                   -- backup vers PDF si besoin
  display_order int default 100,
  created_at timestamptz default now()
);

create index idx_programs_goal on public.programs(goal);

-- ----------------------------------------------------------------------------
-- workouts — séance générique (template) ou séance d'un programme
-- ----------------------------------------------------------------------------

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete cascade,
  week_number int,                                   -- null = standalone
  day_number int,                                    -- 1..7
  title_fr text not null,
  title_en text not null,
  title_nl text not null,
  focus text,                                        -- 'Lower body strength', 'MetCon'
  estimated_duration_min int not null default 45,
  intro_fr text,
  intro_en text,
  intro_nl text,
  is_template boolean default false,                 -- réutilisable hors programme
  created_at timestamptz default now(),
  unique (program_id, week_number, day_number)
);

create index idx_workouts_program on public.workouts(program_id);

-- ----------------------------------------------------------------------------
-- workout_exercises — exercices d'une séance, ordonnés
-- ----------------------------------------------------------------------------

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  block text default 'main',                         -- 'warmup','main','accessory','metcon','cooldown'
  position int not null,                             -- ordre d'affichage
  prescribed_sets int not null default 3,
  prescribed_reps text,                              -- '8-12', 'AMRAP', '30s'
  prescribed_rpe numeric(3,1),                       -- 7.5
  prescribed_weight_pct_1rm int,                     -- 80 = 80% 1RM
  prescribed_rest_sec int default 90,
  set_type set_type not null default 'work',
  notes_fr text,
  notes_en text,
  notes_nl text,
  superset_group text,                               -- 'A', 'B' for A1/A2 supersets
  created_at timestamptz default now()
);

create index idx_we_workout on public.workout_exercises(workout_id);
create index idx_we_exercise on public.workout_exercises(exercise_id);

-- ----------------------------------------------------------------------------
-- user_program_enrollments — un user suit un programme
-- ----------------------------------------------------------------------------

create table public.user_program_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.programs(id),
  start_date date not null default current_date,
  current_week int default 1,
  current_day int default 1,
  is_active boolean default true,
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, program_id, start_date)
);

create index idx_upe_user on public.user_program_enrollments(user_id);
create index idx_upe_active on public.user_program_enrollments(user_id, is_active) where is_active = true;

-- ----------------------------------------------------------------------------
-- workout_sessions — séance effectivement réalisée par un user
-- ----------------------------------------------------------------------------

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete set null,
  enrollment_id uuid references public.user_program_enrollments(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status session_status not null default 'in_progress',
  rpe_overall numeric(3,1),                          -- ressenti global 0-10
  notes text,
  duration_sec int generated always as (
    case when ended_at is null then null
    else extract(epoch from (ended_at - started_at))::int end
  ) stored,
  created_at timestamptz default now()
);

create index idx_ws_user on public.workout_sessions(user_id);
create index idx_ws_user_date on public.workout_sessions(user_id, started_at desc);
create index idx_ws_status on public.workout_sessions(user_id, status);

-- ----------------------------------------------------------------------------
-- set_logs — chaque série effectuée
-- ----------------------------------------------------------------------------

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  workout_exercise_id uuid references public.workout_exercises(id) on delete set null,
  exercise_id uuid not null references public.exercises(id),
  set_number int not null,
  set_type set_type not null default 'work',
  reps int,
  weight_kg numeric(6,2),
  duration_sec int,                                  -- pour planks, runs, rows
  distance_m int,                                    -- pour runs, rows, ski
  rpe numeric(3,1),
  rir int,                                           -- reps in reserve
  rest_sec int,
  is_pr boolean default false,                       -- personal record flag
  notes text,
  created_at timestamptz default now()
);

create index idx_sl_session on public.set_logs(session_id);
create index idx_sl_exercise on public.set_logs(exercise_id);
create index idx_sl_pr on public.set_logs(exercise_id, is_pr) where is_pr = true;

-- ----------------------------------------------------------------------------
-- exercise_personal_records — vue cache des PR par user x exercise
-- ----------------------------------------------------------------------------

create table public.exercise_personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  best_1rm_kg numeric(6,2),                          -- estimé Epley si nécessaire
  best_5rm_kg numeric(6,2),
  best_10rm_kg numeric(6,2),
  best_volume_kg numeric(8,2),                       -- meilleur tonnage / séance
  best_duration_sec int,                             -- meilleur temps (planche, course)
  best_distance_m int,                               -- meilleure distance
  achieved_at timestamptz default now(),
  set_log_id uuid references public.set_logs(id),
  unique (user_id, exercise_id)
);

create index idx_epr_user on public.exercise_personal_records(user_id);

-- ----------------------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------------------

-- 1. Auto-progress enrollment when a session for week.day is completed
create or replace function progress_user_enrollment()
returns trigger language plpgsql security definer as $$
declare
  v_program_id uuid;
  v_week int;
  v_day int;
  v_total_weeks int;
  v_sessions_per_week int;
begin
  if new.status <> 'completed' or new.enrollment_id is null then
    return new;
  end if;

  select w.program_id, w.week_number, w.day_number
    into v_program_id, v_week, v_day
    from public.workouts w
    where w.id = new.workout_id;

  if v_program_id is null then return new; end if;

  select duration_weeks, sessions_per_week
    into v_total_weeks, v_sessions_per_week
    from public.programs where id = v_program_id;

  -- next day in current week, or roll to next week
  if v_day < v_sessions_per_week then
    update public.user_program_enrollments
       set current_day = v_day + 1
     where id = new.enrollment_id;
  elsif v_week < v_total_weeks then
    update public.user_program_enrollments
       set current_week = v_week + 1, current_day = 1
     where id = new.enrollment_id;
  else
    update public.user_program_enrollments
       set is_active = false, completed_at = now()
     where id = new.enrollment_id;
  end if;

  return new;
end $$;

create trigger trg_progress_enrollment
  after update of status on public.workout_sessions
  for each row when (new.status = 'completed')
  execute function progress_user_enrollment();

-- 2. Compute estimated 1RM (Epley) and update PR cache on set_log insert
create or replace function update_exercise_pr()
returns trigger language plpgsql security definer as $$
declare
  v_user_id uuid;
  v_estimated_1rm numeric(6,2);
  v_existing record;
begin
  if new.weight_kg is null or new.reps is null or new.reps < 1 then
    return new;
  end if;

  select user_id into v_user_id
    from public.workout_sessions where id = new.session_id;

  -- Epley: 1RM = weight * (1 + reps/30)
  v_estimated_1rm := new.weight_kg * (1 + new.reps::numeric / 30);

  select * into v_existing
    from public.exercise_personal_records
   where user_id = v_user_id and exercise_id = new.exercise_id;

  if v_existing is null then
    insert into public.exercise_personal_records
      (user_id, exercise_id, best_1rm_kg, best_5rm_kg, best_10rm_kg, set_log_id)
    values (
      v_user_id, new.exercise_id, v_estimated_1rm,
      case when new.reps = 5 then new.weight_kg end,
      case when new.reps = 10 then new.weight_kg end,
      new.id
    );
    update public.set_logs set is_pr = true where id = new.id;
  else
    if v_estimated_1rm > coalesce(v_existing.best_1rm_kg, 0) then
      update public.exercise_personal_records
         set best_1rm_kg = v_estimated_1rm,
             achieved_at = now(),
             set_log_id = new.id
       where id = v_existing.id;
      update public.set_logs set is_pr = true where id = new.id;
    end if;
  end if;

  return new;
end $$;

create trigger trg_update_pr
  after insert on public.set_logs
  for each row execute function update_exercise_pr();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

alter table public.exercises enable row level security;
alter table public.programs enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.user_program_enrollments enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.set_logs enable row level security;
alter table public.exercise_personal_records enable row level security;

-- Catalog tables: readable by any authenticated user
create policy "exercises readable" on public.exercises
  for select using (auth.role() = 'authenticated');

create policy "programs readable" on public.programs
  for select using (auth.role() = 'authenticated');

create policy "workouts readable" on public.workouts
  for select using (auth.role() = 'authenticated');

create policy "workout_exercises readable" on public.workout_exercises
  for select using (auth.role() = 'authenticated');

-- User-owned tables: full CRUD on own rows only
create policy "enrollments own" on public.user_program_enrollments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "sessions own" on public.workout_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "set_logs own" on public.set_logs
  for all using (
    auth.uid() = (select user_id from public.workout_sessions where id = session_id)
  ) with check (
    auth.uid() = (select user_id from public.workout_sessions where id = session_id)
  );

create policy "prs own" on public.exercise_personal_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Coach role (Doudouh) writes the catalog: handled by service_role in back-office.
-- RLS automatically bypassed by service_role key used in apps/web admin.
