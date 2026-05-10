-- ============================================================
-- Coach DM · Migration 015 · Push notifications
-- ============================================================
-- 1. Adds expo_push_token column to profiles
-- 2. Triggers Edge function 'send-push' on new messages and check-ins
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Push token columns
-- ─────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'expo_push_token'
  ) then
    alter table public.profiles add column expo_push_token text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'push_enabled'
  ) then
    alter table public.profiles add column push_enabled boolean default true;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'locale'
  ) then
    alter table public.profiles add column locale text default 'fr'
      check (locale in ('fr', 'en', 'nl'));
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 2. Helper to call the Edge function via pg_net
-- ─────────────────────────────────────────────────────────────
-- Requires pg_net extension (provided by Supabase). If unavailable,
-- the trigger silently no-ops.
do $$
begin
  create extension if not exists pg_net with schema extensions;
exception
  when others then
    raise notice 'pg_net not installable: %', sqlerrm;
end $$;

create or replace function public.send_push(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_url text := current_setting('app.supabase_url', true) || '/functions/v1/send-push';
  v_key text := current_setting('app.service_role_key', true);
begin
  if v_url is null or v_key is null then
    raise notice 'send_push: SUPABASE_URL or SERVICE_ROLE_KEY not configured';
    return;
  end if;

  perform extensions.http_post(
    url := v_url,
    body := jsonb_build_object(
      'user_id', p_user_id,
      'title', p_title,
      'body', p_body,
      'data', p_data
    )::text,
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    timeout_milliseconds := 5000
  );
exception
  when others then
    raise notice 'send_push failed (non-fatal): %', sqlerrm;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 3. Push on new message
-- ─────────────────────────────────────────────────────────────
create or replace function public.tg_push_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_sender_name text;
  v_sender_locale text;
begin
  select coalesce(full_name, email) into v_sender_name
  from public.profiles where id = new.sender_user_id;

  select coalesce(locale, 'fr') into v_sender_locale
  from public.profiles where id = new.recipient_user_id;

  perform public.send_push(
    new.recipient_user_id,
    coalesce(v_sender_name, 'Coach DM'),
    left(new.body, 120),
    jsonb_build_object(
      'type', 'message',
      'thread_id', new.thread_id,
      'message_id', new.id
    )
  );

  return new;
end $$;

drop trigger if exists trg_push_on_message on public.messages;
create trigger trg_push_on_message
  after insert on public.messages
  for each row execute function public.tg_push_on_message();

-- ─────────────────────────────────────────────────────────────
-- 4. Push on check-in submitted (notify coach)
-- ─────────────────────────────────────────────────────────────
create or replace function public.tg_push_on_checkin_submit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_client_name text;
  v_coach_locale text;
  v_title text;
  v_body text;
begin
  if new.status <> 'submitted' or old.status = 'submitted' then
    return new;
  end if;

  select coalesce(full_name, email) into v_client_name
  from public.profiles where id = new.client_user_id;

  select coalesce(locale, 'fr') into v_coach_locale
  from public.profiles where id = new.coach_user_id;

  if v_coach_locale = 'fr' then
    v_title := 'Nouveau check-in 📋';
    v_body := coalesce(v_client_name, 'Un client') || ' a soumis son check-in hebdo.';
  elsif v_coach_locale = 'nl' then
    v_title := 'Nieuwe check-in 📋';
    v_body := coalesce(v_client_name, 'Een klant') || ' heeft de wekelijkse check-in ingediend.';
  else
    v_title := 'New check-in 📋';
    v_body := coalesce(v_client_name, 'A client') || ' submitted their weekly check-in.';
  end if;

  perform public.send_push(
    new.coach_user_id,
    v_title,
    v_body,
    jsonb_build_object('type', 'check_in', 'check_in_id', new.id)
  );

  return new;
end $$;

drop trigger if exists trg_push_on_checkin_submit on public.check_ins;
create trigger trg_push_on_checkin_submit
  after update on public.check_ins
  for each row execute function public.tg_push_on_checkin_submit();

-- ─────────────────────────────────────────────────────────────
-- 5. Push on check-in reviewed (notify client)
-- ─────────────────────────────────────────────────────────────
create or replace function public.tg_push_on_checkin_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_client_locale text;
  v_title text;
  v_body text;
begin
  if new.status <> 'reviewed' or old.status = 'reviewed' then
    return new;
  end if;

  select coalesce(locale, 'fr') into v_client_locale
  from public.profiles where id = new.client_user_id;

  if v_client_locale = 'fr' then
    v_title := 'Retour de ton coach 💬';
    v_body := 'Ton check-in a été examiné. Découvre le retour.';
  elsif v_client_locale = 'nl' then
    v_title := 'Feedback van je coach 💬';
    v_body := 'Je check-in is bekeken. Lees de feedback.';
  else
    v_title := 'Coach feedback 💬';
    v_body := 'Your check-in has been reviewed. See the feedback.';
  end if;

  perform public.send_push(
    new.client_user_id,
    v_title,
    v_body,
    jsonb_build_object('type', 'check_in_reviewed', 'check_in_id', new.id)
  );

  return new;
end $$;

drop trigger if exists trg_push_on_checkin_review on public.check_ins;
create trigger trg_push_on_checkin_review
  after update on public.check_ins
  for each row execute function public.tg_push_on_checkin_review();
