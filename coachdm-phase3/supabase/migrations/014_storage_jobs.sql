-- ============================================================
-- Coach DM · Migration 014 · Storage + scheduled jobs
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Storage bucket for check-in photos
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'check-in-photos',
  'check-in-photos',
  false,                                   -- private bucket
  10485760,                                -- 10 MB max per photo
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS: clients upload to their own folder, coach reads assigned clients
drop policy if exists "check_in_photos_client_upload" on storage.objects;
create policy "check_in_photos_client_upload" on storage.objects
  for insert with check (
    bucket_id = 'check-in-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "check_in_photos_owner_read" on storage.objects;
create policy "check_in_photos_owner_read" on storage.objects
  for select using (
    bucket_id = 'check-in-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.coaches_user(((storage.foldername(name))[1])::uuid, auth.uid())
      or public.is_super_admin()
    )
  );

drop policy if exists "check_in_photos_owner_delete" on storage.objects;
create policy "check_in_photos_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'check-in-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_super_admin()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 2. Storage bucket for message attachments
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments',
  'message-attachments',
  false,
  26214400,  -- 25 MB
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'video/mp4', 'video/quicktime',
    'application/pdf',
    'audio/mpeg', 'audio/mp4', 'audio/x-m4a'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "msg_att_sender_upload" on storage.objects;
create policy "msg_att_sender_upload" on storage.objects
  for insert with check (
    bucket_id = 'message-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "msg_att_participant_read" on storage.objects;
create policy "msg_att_participant_read" on storage.objects
  for select using (
    bucket_id = 'message-attachments'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.messages m
        where m.attachment_url like '%' || name || '%'
          and (m.sender_user_id = auth.uid() or m.recipient_user_id = auth.uid())
      )
      or public.is_super_admin()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 3. Job: create pending check-ins when due
-- ─────────────────────────────────────────────────────────────
create or replace function public.create_due_check_ins()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_count integer := 0;
  v_schedule record;
  v_week_start date;
begin
  for v_schedule in
    select s.*
    from public.check_in_schedules s
    where s.is_active = true
      and s.next_due_at <= now()
  loop
    v_week_start := public.iso_week_monday(
      (v_schedule.next_due_at at time zone v_schedule.timezone)::date
    );

    insert into public.check_ins (
      client_user_id, coach_user_id, week_start_date, status
    )
    values (
      v_schedule.client_user_id,
      v_schedule.coach_user_id,
      v_week_start,
      'pending'
    )
    on conflict (client_user_id, week_start_date) do nothing;

    -- Bump next_due_at even if check-in already exists (idempotent)
    update public.check_in_schedules
    set next_due_at = v_schedule.next_due_at + case v_schedule.frequency
      when 'weekly' then interval '7 days'
      when 'biweekly' then interval '14 days'
      when 'monthly' then interval '1 month'
    end
    where id = v_schedule.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end $$;

-- Schedule via pg_cron if extension is available (no-op otherwise)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'create-due-check-ins',
      '0 8 * * *',  -- every day at 08:00 UTC
      $cron$ select public.create_due_check_ins(); $cron$
    );
  end if;
exception
  when others then
    raise notice 'pg_cron not available: %', sqlerrm;
end $$;
