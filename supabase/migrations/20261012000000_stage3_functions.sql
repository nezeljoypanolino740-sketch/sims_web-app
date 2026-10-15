-- =====================================================================
-- SIMS migration 2: helper RPCs used by the app + staff notification.
-- Run in the SQL Editor AFTER 20261011000000_sims_schema.sql.
-- =====================================================================

-- Make exactly one academic year active (two statements in one transaction,
-- so the "one active year" unique index is never violated).
create or replace function public.set_active_academic_year(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;
  if not exists (select 1 from public.academic_years where id = p_id) then
    raise exception 'Academic year not found' using errcode = 'P0002';
  end if;

  update public.academic_years set is_active = false where is_active and id <> p_id;
  update public.academic_years set is_active = true where id = p_id;
end;
$$;

-- Save a whole class's attendance at once. SECURITY INVOKER: row level
-- security still applies, so only staff can write. Existing entries for the
-- same student, date and subject are updated instead of duplicated.
create or replace function public.save_attendance(p_entries jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_staff() then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;
  if jsonb_typeof(p_entries) is distinct from 'array' or jsonb_array_length(p_entries) = 0 then
    raise exception 'No attendance entries were provided' using errcode = '22023';
  end if;
  if jsonb_array_length(p_entries) > 1000 then
    raise exception 'Too many entries in one request' using errcode = '22023';
  end if;

  insert into public.attendance (student_id, subject_id, attendance_date, status, remarks)
  select (e.entry ->> 'student_id')::uuid,
         nullif(e.entry ->> 'subject_id', '')::uuid,
         (e.entry ->> 'attendance_date')::date,
         e.entry ->> 'status',
         nullif(trim(e.entry ->> 'remarks'), '')
  from jsonb_array_elements(p_entries) as e(entry)
  on conflict on constraint attendance_unique_entry
  do update set status = excluded.status, remarks = excluded.remarks;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Tell active staff when a student activates their account.
create or replace function public.notify_staff_student_linked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (profile_id, title, message)
  select p.id,
         'Student account linked',
         format('%s %s (%s) activated their account.', new.first_name, new.last_name, new.student_number)
  from public.profiles p
  where p.role in ('administrator', 'admin') and p.account_status = 'active';
  return new;
end;
$$;

create trigger students_notify_linked
  after update of profile_id on public.students
  for each row when (old.profile_id is null and new.profile_id is not null)
  execute function public.notify_staff_student_linked();

revoke all on function public.set_active_academic_year(uuid) from public, anon;
revoke all on function public.save_attendance(jsonb)         from public, anon;
grant execute on function public.set_active_academic_year(uuid) to authenticated;
grant execute on function public.save_attendance(jsonb)         to authenticated;
revoke all on function public.notify_staff_student_linked() from public, anon, authenticated;
