-- ============================================================
-- Coach DM · Migration 011 · Messaging (Realtime)
-- ============================================================
-- 1:1 messaging between coach and assigned client.
-- Threads are auto-created on first assignment (trigger).
-- Realtime publication enabled at the bottom.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. message_threads — one row per coach/client pair
-- ─────────────────────────────────────────────────────────────
create table if not exists public.message_threads (
  id uuid primary key default gen_random_uuid(),
  coach_user_id uuid not null references auth.users(id) on delete cascade,
  client_user_id uuid not null references auth.users(id) on delete cascade,
  last_message_at timestamptz,
  last_message_preview text,
  coach_unread_count integer not null default 0,
  client_unread_count integer not null default 0,
  is_archived_by_coach boolean not null default false,
  is_archived_by_client boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coach_user_id, client_user_id),
  check (coach_user_id <> client_user_id)
);

create index if not exists message_threads_coach_idx
  on public.message_threads(coach_user_id, last_message_at desc nulls last);
create index if not exists message_threads_client_idx
  on public.message_threads(client_user_id, last_message_at desc nulls last);

-- ─────────────────────────────────────────────────────────────
-- 2. messages — individual messages
-- ─────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  attachment_url text,
  attachment_type text check (attachment_type in (
    'image', 'video', 'pdf', 'audio'
  )),
  -- Quick references to other entities the message relates to
  ref_type text check (ref_type in (
    'workout_session', 'check_in', 'food_log', 'weight_log', 'program'
  )),
  ref_id uuid,
  read_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_thread_idx
  on public.messages(thread_id, created_at desc);
create index if not exists messages_recipient_unread_idx
  on public.messages(recipient_user_id, read_at)
  where read_at is null and deleted_at is null;

-- ─────────────────────────────────────────────────────────────
-- 3. Auto-create thread when coach_clients row inserted
-- ─────────────────────────────────────────────────────────────
create or replace function public.tg_create_thread_on_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.message_threads (coach_user_id, client_user_id)
  values (new.coach_user_id, new.client_user_id)
  on conflict (coach_user_id, client_user_id) do nothing;
  return new;
end $$;

drop trigger if exists trg_create_thread on public.coach_clients;
create trigger trg_create_thread
  after insert on public.coach_clients
  for each row execute function public.tg_create_thread_on_assignment();

-- ─────────────────────────────────────────────────────────────
-- 4. Update thread metadata on new message
-- ─────────────────────────────────────────────────────────────
create or replace function public.tg_update_thread_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_thread public.message_threads%rowtype;
begin
  select * into v_thread from public.message_threads where id = new.thread_id;

  update public.message_threads
  set
    last_message_at = new.created_at,
    last_message_preview = left(new.body, 140),
    coach_unread_count = case
      when new.recipient_user_id = v_thread.coach_user_id
      then coach_unread_count + 1
      else coach_unread_count
    end,
    client_unread_count = case
      when new.recipient_user_id = v_thread.client_user_id
      then client_unread_count + 1
      else client_unread_count
    end,
    is_archived_by_coach = false,
    is_archived_by_client = false
  where id = new.thread_id;

  return new;
end $$;

drop trigger if exists trg_update_thread on public.messages;
create trigger trg_update_thread
  after insert on public.messages
  for each row execute function public.tg_update_thread_on_message();

-- ─────────────────────────────────────────────────────────────
-- 5. Mark messages as read (RPC)
-- ─────────────────────────────────────────────────────────────
create or replace function public.mark_thread_read(p_thread_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_thread public.message_threads%rowtype;
  v_uid uuid := auth.uid();
begin
  select * into v_thread from public.message_threads where id = p_thread_id;
  if v_thread.id is null then
    raise exception 'Thread not found';
  end if;
  if v_uid not in (v_thread.coach_user_id, v_thread.client_user_id)
     and not public.is_super_admin(v_uid) then
    raise exception 'Forbidden';
  end if;

  update public.messages
  set read_at = now()
  where thread_id = p_thread_id
    and recipient_user_id = v_uid
    and read_at is null
    and deleted_at is null;

  if v_uid = v_thread.coach_user_id then
    update public.message_threads
    set coach_unread_count = 0
    where id = p_thread_id;
  elsif v_uid = v_thread.client_user_id then
    update public.message_threads
    set client_unread_count = 0
    where id = p_thread_id;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 6. RLS
-- ─────────────────────────────────────────────────────────────
alter table public.message_threads enable row level security;
alter table public.messages enable row level security;

drop policy if exists threads_participant_read on public.message_threads;
create policy threads_participant_read on public.message_threads
  for select using (
    coach_user_id = auth.uid()
    or client_user_id = auth.uid()
    or public.is_super_admin()
  );

drop policy if exists threads_participant_update on public.message_threads;
create policy threads_participant_update on public.message_threads
  for update using (
    coach_user_id = auth.uid()
    or client_user_id = auth.uid()
    or public.is_super_admin()
  );

-- Threads are inserted by trigger with security definer; block direct insert
drop policy if exists threads_no_direct_insert on public.message_threads;
create policy threads_no_direct_insert on public.message_threads
  for insert with check (public.is_super_admin());

drop policy if exists messages_participant_read on public.messages;
create policy messages_participant_read on public.messages
  for select using (
    sender_user_id = auth.uid()
    or recipient_user_id = auth.uid()
    or public.is_super_admin()
  );

drop policy if exists messages_send on public.messages;
create policy messages_send on public.messages
  for insert with check (
    sender_user_id = auth.uid()
    and exists (
      select 1 from public.message_threads t
      where t.id = thread_id
        and (t.coach_user_id = auth.uid() or t.client_user_id = auth.uid())
    )
    and (
      -- Recipient must be the other participant
      exists (
        select 1 from public.message_threads t
        where t.id = thread_id
          and recipient_user_id in (t.coach_user_id, t.client_user_id)
          and recipient_user_id <> auth.uid()
      )
    )
  );

drop policy if exists messages_self_edit on public.messages;
create policy messages_self_edit on public.messages
  for update using (sender_user_id = auth.uid())
  with check (sender_user_id = auth.uid());

-- updated_at trigger on threads
drop trigger if exists trg_threads_updated on public.message_threads;
create trigger trg_threads_updated
  before update on public.message_threads
  for each row execute function public.tg_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 7. Realtime publication
-- ─────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'message_threads'
  ) then
    alter publication supabase_realtime add table public.message_threads;
  end if;
end $$;
