-- ============================================================
-- Coach DM · Migration 012 · Weekly check-ins
-- ============================================================
-- Hebdo, lundi par défaut. Photos + mensurations + ressenti.
-- Photos stored in Supabase Storage bucket 'check-in-photos'.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. check_in_schedules — per-client cadence
-- ─────────────────────────────────────────────────────────────
create table if not exists public.check_in_schedules (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references auth.users(id) on delete cascade,
  coach_user_id uuid not null references auth.users(id) on delete cascade,
  frequency text not null default 'weekly' check (frequency in (
    'weekly', 'biweekly', 'monthly'
  )),
  -- 1 = Monday, 7 = Sunday (ISO 8601)
  day_of_week smallint not null default 1 check (day_of_week between 1 and 7),
  reminder_time time not null default '08:00:00',
  timezone text not null default 'Europe/Brussels',
  is_active boolean not null default true,
  next_due_at timestamptz,
  last_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_user_id)
);

create index if not exists check_in_schedules_due_idx
  on public.check_in_schedules(next_due_at)
  where is_active = true;

-- ─────────────────────────────────────────────────────────────
-- 2. check_ins — actual submissions
-- ─────────────────────────────────────────────────────────────
create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references auth.users(id) on delete cascade,
  coach_user_id uuid not null references auth.users(id) on delete cascade,
  week_start_date date not null,  -- Monday of the check-in week
  status text not null default 'pending' check (status in (
    'pending', 'submitted', 'reviewed'
  )),

  -- Body metrics (all optional — clients submit what they have)
  weight_kg numeric(5,2) check (weight_kg between 30 and 300),
  body_fat_pct numeric(4,2) check (body_fat_pct between 2 and 60),
  waist_cm numeric(5,2),
  hips_cm numeric(5,2),
  chest_cm numeric(5,2),
  arm_cm numeric(5,2),
  thigh_cm numeric(5,2),

  -- Subjective ressenti (1–5 scales)
  energy_level smallint check (energy_level between 1 and 5),
  sleep_quality smallint check (sleep_quality between 1 and 5),
  stress_level smallint check (stress_level between 1 and 5),
  motivation_level smallint check (motivation_level between 1 and 5),
  hunger_level smallint check (hunger_level between 1 and 5),
  soreness_level smallint check (soreness_level between 1 and 5),

  -- Adherence
  workouts_completed smallint check (workouts_completed between 0 and 14),
  workouts_planned smallint check (workouts_planned between 0 and 14),
  nutrition_adherence_pct smallint check (nutrition_adherence_pct between 0 and 100),

  -- Free-form
  client_notes text,        -- "Comment tu te sens cette semaine ?"
  client_wins text,         -- "Tes victoires de la semaine"
  client_struggles text,    -- "Tes difficultés"
  coach_feedback text,      -- Filled by coach when reviewing
  coach_action_items text,  -- Coach prescribes next steps

  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_user_id, week_start_date)
);

create index if not exists check_ins_coach_status_idx
  on public.check_ins(coach_user_id, status, week_start_date desc);
create index if not exists check_ins_client_week_idx
  on public.check_ins(client_user_id, week_start_date desc);

-- ─────────────────────────────────────────────────────────────
-- 3. check_in_photos — multiple photos per check-in
-- ─────────────────────────────────────────────────────────────
create table if not exists public.check_in_photos (
  id uuid primary key default gen_random_uuid(),
  check_in_id uuid not null references public.check_ins(id) on delete cascade,
  storage_path text not null,  -- path in 'check-in-photos' bucket
  pose text not null check (pose in ('front', 'side', 'back', 'other')),
  display_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists check_in_photos_checkin_idx
  on public.check_in_photos(check_in_id, display_order);

-- ─────────────────────────────────────────────────────────────
-- 4. Helper: compute the Monday of any date (Europe/Brussels)
-- ─────────────────────────────────────────────────────────────
create or replace function public.iso_week_monday(d date)
returns date language sql immutable as $$
  select d - ((extract(isodow from d)::int - 1));
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. Auto-create schedule when client gets a coach
-- ─────────────────────────────────────────────────────────────
create or replace function public.tg_create_checkin_schedule()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.check_in_schedules (
    client_user_id, coach_user_id, next_due_at
  )
  values (
    new.client_user_id,
    new.coach_user_id,
    -- Next Monday 08:00 Europe/Brussels
    (date_trunc('week', now() at time zone 'Europe/Brussels')
      + interval '7 days' + interval '8 hours')
      at time zone 'Europe/Brussels'
  )
  on conflict (client_user_id) do update
    set coach_user_id = excluded.coach_user_id,
        is_active = true;
  return new;
end $$;

drop trigger if exists trg_create_checkin_schedule on public.coach_clients;
create trigger trg_create_checkin_schedule
  after insert on public.coach_clients
  for each row when (new.status = 'active')
  execute function public.tg_create_checkin_schedule();

-- ─────────────────────────────────────────────────────────────
-- 6. RPC: submit a check-in (client side)
-- ─────────────────────────────────────────────────────────────
create or replace function public.submit_check_in(p_check_in_id uuid)
returns public.check_ins
language plpgsql security definer set search_path = public as $$
declare
  v_row public.check_ins%rowtype;
begin
  update public.check_ins
  set status = 'submitted',
      submitted_at = now()
  where id = p_check_in_id
    and client_user_id = auth.uid()
    and status = 'pending'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Check-in not found, not yours, or already submitted';
  end if;

  -- Update schedule
  update public.check_in_schedules
  set last_completed_at = now(),
      next_due_at = next_due_at + case frequency
        when 'weekly' then interval '7 days'
        when 'biweekly' then interval '14 days'
        when 'monthly' then interval '1 month'
      end
  where client_user_id = auth.uid();

  -- Notify coach via auto-message in their thread
  insert into public.messages (
    thread_id, sender_user_id, recipient_user_id, body, ref_type, ref_id
  )
  select
    t.id,
    v_row.client_user_id,
    v_row.coach_user_id,
    '📋 Nouveau check-in soumis · New check-in submitted · Nieuwe check-in ingediend',
    'check_in',
    v_row.id
  from public.message_threads t
  where t.coach_user_id = v_row.coach_user_id
    and t.client_user_id = v_row.client_user_id;

  return v_row;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 7. RLS
-- ─────────────────────────────────────────────────────────────
alter table public.check_in_schedules enable row level security;
alter table public.check_ins enable row level security;
alter table public.check_in_photos enable row level security;

drop policy if exists schedules_visibility on public.check_in_schedules;
create policy schedules_visibility on public.check_in_schedules
  for select using (
    client_user_id = auth.uid()
    or coach_user_id = auth.uid()
    or public.is_super_admin()
  );

drop policy if exists schedules_coach_manage on public.check_in_schedules;
create policy schedules_coach_manage on public.check_in_schedules
  for all using (
    coach_user_id = auth.uid() or public.is_super_admin()
  )
  with check (
    coach_user_id = auth.uid() or public.is_super_admin()
  );

drop policy if exists schedules_client_self_update on public.check_in_schedules;
create policy schedules_client_self_update on public.check_in_schedules
  for update using (client_user_id = auth.uid())
  with check (client_user_id = auth.uid());

drop policy if exists check_ins_visibility on public.check_ins;
create policy check_ins_visibility on public.check_ins
  for select using (
    client_user_id = auth.uid()
    or coach_user_id = auth.uid()
    or public.is_super_admin()
  );

drop policy if exists check_ins_client_write on public.check_ins;
create policy check_ins_client_write on public.check_ins
  for update using (client_user_id = auth.uid() and status = 'pending')
  with check (client_user_id = auth.uid());

drop policy if exists check_ins_coach_review on public.check_ins;
create policy check_ins_coach_review on public.check_ins
  for update using (
    coach_user_id = auth.uid() or public.is_super_admin()
  )
  with check (
    coach_user_id = auth.uid() or public.is_super_admin()
  );

drop policy if exists check_ins_insert on public.check_ins;
create policy check_ins_insert on public.check_ins
  for insert with check (
    client_user_id = auth.uid()
    or coach_user_id = auth.uid()
    or public.is_super_admin()
  );

drop policy if exists check_in_photos_read on public.check_in_photos;
create policy check_in_photos_read on public.check_in_photos
  for select using (
    exists (
      select 1 from public.check_ins ci
      where ci.id = check_in_id
        and (
          ci.client_user_id = auth.uid()
          or ci.coach_user_id = auth.uid()
          or public.is_super_admin()
        )
    )
  );

drop policy if exists check_in_photos_write on public.check_in_photos;
create policy check_in_photos_write on public.check_in_photos
  for all using (
    exists (
      select 1 from public.check_ins ci
      where ci.id = check_in_id and ci.client_user_id = auth.uid()
    )
    or public.is_super_admin()
  )
  with check (
    exists (
      select 1 from public.check_ins ci
      where ci.id = check_in_id and ci.client_user_id = auth.uid()
    )
    or public.is_super_admin()
  );

-- updated_at triggers
drop trigger if exists trg_schedules_updated on public.check_in_schedules;
create trigger trg_schedules_updated
  before update on public.check_in_schedules
  for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_check_ins_updated on public.check_ins;
create trigger trg_check_ins_updated
  before update on public.check_ins
  for each row execute function public.tg_set_updated_at();
