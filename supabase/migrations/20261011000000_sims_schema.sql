-- =====================================================================
-- SIMS - Student Information Management System
-- Migration 20261011000000: tables, indexes, functions, triggers, RLS
--
-- Run this ONCE on a fresh Supabase project (SQL Editor -> New query ->
-- paste -> Run) or with the Supabase CLI (`supabase db push`).
-- Requires PostgreSQL 15+ (every current Supabase project).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------

create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text        not null default '',
  email          text        not null,
  role           text        not null default 'user'
                 check (role in ('administrator', 'admin', 'user')),
  account_status text        not null default 'pending'
                 check (account_status in ('active', 'inactive', 'pending')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.students (
  id                uuid primary key default gen_random_uuid(),
  student_number    text        not null unique
                    check (length(trim(student_number)) > 0),
  profile_id        uuid        unique references public.profiles (id) on delete set null,
  first_name        text        not null check (length(trim(first_name)) > 0),
  middle_name       text,
  last_name         text        not null check (length(trim(last_name)) > 0),
  date_of_birth     date        not null,
  gender            text        check (gender in ('male', 'female', 'other')),
  email             text        not null,
  phone             text,
  address           text,
  grade_level       text        not null check (length(trim(grade_level)) > 0),
  section           text,
  school_year       text        not null check (school_year ~ '^[0-9]{4}-[0-9]{4}$'),
  enrollment_status text        not null default 'enrolled'
                    check (enrollment_status in ('enrolled', 'pending', 'graduated', 'dropped', 'archived')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.teachers (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid        unique references public.profiles (id) on delete set null,
  employee_number text        not null unique
                  check (length(trim(employee_number)) > 0),
  full_name       text        not null check (length(trim(full_name)) > 0),
  email           text        not null,
  phone           text,
  specialization  text,
  employment_status text      not null default 'active'
                  check (employment_status in ('active', 'on_leave', 'inactive')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.subjects (
  id           uuid primary key default gen_random_uuid(),
  subject_code text        not null unique check (length(trim(subject_code)) > 0),
  subject_name text        not null check (length(trim(subject_name)) > 0),
  description  text,
  created_at   timestamptz not null default now()
);

create table public.academic_years (
  id          uuid primary key default gen_random_uuid(),
  school_year text        not null check (school_year ~ '^[0-9]{4}-[0-9]{4}$'),
  semester    text        not null check (semester in ('1st Semester', '2nd Semester', 'Summer')),
  is_active   boolean     not null default false,
  created_at  timestamptz not null default now(),
  unique (school_year, semester)
);

create table public.attendance (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid        not null references public.students (id) on delete restrict,
  subject_id      uuid        references public.subjects (id) on delete set null,
  attendance_date date        not null,
  status          text        not null
                  check (status in ('present', 'absent', 'late', 'excused')),
  remarks         text,
  recorded_by     uuid        references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  -- One entry per student, date and subject. NULLS NOT DISTINCT also makes
  -- "whole-day" entries (subject_id is null) unique per student per date.
  constraint attendance_unique_entry
    unique nulls not distinct (student_id, attendance_date, subject_id)
);

create table public.grades (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid          not null references public.students (id) on delete restrict,
  subject_id      uuid          not null references public.subjects (id) on delete restrict,
  teacher_id      uuid          references public.teachers (id) on delete set null,
  grading_period  text          not null check (length(trim(grading_period)) > 0),
  school_year     text          not null check (school_year ~ '^[0-9]{4}-[0-9]{4}$'),
  assessment_name text          not null check (length(trim(assessment_name)) > 0),
  score           numeric(7, 2) not null check (score >= 0),
  total_score     numeric(7, 2) not null check (total_score > 0),
  remarks         text,
  created_by      uuid          references public.profiles (id) on delete set null,
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now(),
  constraint grades_score_within_total check (score <= total_score)
);

create table public.activity_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid        references public.profiles (id) on delete set null,
  action      text        not null,
  entity_type text        not null,
  entity_id   uuid,
  created_at  timestamptz not null default now()
);

-- Needed by the spec's "Notifications" module for students.
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid        not null references public.profiles (id) on delete cascade,
  title      text        not null,
  message    text        not null,
  is_read    boolean     not null default false,
  created_at timestamptz not null default now()
);

-- Needed by the spec's "Manage school information" feature. Exactly one row.
create table public.school_settings (
  id            smallint primary key default 1 check (id = 1),
  school_name   text        not null default 'My School',
  address       text,
  contact_email text,
  contact_phone text,
  updated_at    timestamptz not null default now()
);

insert into public.school_settings (id) values (1);

-- ---------------------------------------------------------------------
-- 2. INDEXES
-- ---------------------------------------------------------------------

create unique index profiles_email_key  on public.profiles (lower(email));
create index profiles_role_idx          on public.profiles (role);
create index profiles_status_idx        on public.profiles (account_status);

create unique index students_email_key  on public.students (lower(email));
create index students_name_idx          on public.students (last_name, first_name);
create index students_class_idx         on public.students (grade_level, section);
create index students_school_year_idx   on public.students (school_year);
create index students_status_idx        on public.students (enrollment_status);

create unique index teachers_email_key  on public.teachers (lower(email));
create index teachers_name_idx          on public.teachers (full_name);

create unique index academic_years_one_active
  on public.academic_years ((true)) where is_active;

create index attendance_student_date_idx on public.attendance (student_id, attendance_date desc);
create index attendance_date_idx         on public.attendance (attendance_date);
create index attendance_subject_idx      on public.attendance (subject_id);

create index grades_student_idx         on public.grades (student_id);
create index grades_subject_idx         on public.grades (subject_id);
create index grades_period_idx          on public.grades (school_year, grading_period);

create index notifications_profile_idx  on public.notifications (profile_id, is_read, created_at desc);
create index activity_logs_created_idx  on public.activity_logs (created_at desc);
create index activity_logs_actor_idx    on public.activity_logs (actor_id);

-- ---------------------------------------------------------------------
-- 3. HELPER FUNCTIONS
-- SECURITY DEFINER + fixed search_path so RLS policies can call them
-- without triggering recursive policy evaluation on public.profiles.
-- A deactivated or unverified (pending) account resolves to NULL, which
-- means "no role" and therefore no access to school records.
-- ---------------------------------------------------------------------

create or replace function public.auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.account_status = 'active'
$$;

create or replace function public.is_administrator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.auth_role() = 'administrator', false)
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.auth_role() in ('administrator', 'admin'), false)
$$;

create or replace function public.current_student_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from public.students s
  join public.profiles p on p.id = s.profile_id
  where s.profile_id = auth.uid()
    and p.account_status = 'active'
    and p.role = 'user'
  limit 1
$$;

-- ---------------------------------------------------------------------
-- 4. TRIGGER FUNCTIONS
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Every new auth user gets a profile. The role is ALWAYS 'user' and the
-- status ALWAYS 'pending': metadata supplied at sign-up is never trusted
-- for privileges. Privileged accounts are created by the Edge Function
-- (service role) or the bootstrap script.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, account_status)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    'user',
    'pending'
  );
  return new;
end;
$$;

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

-- Blocks privilege escalation. Rules:
--  * profile id never changes
--  * no signed-in user may change their OWN role or status
--  * only an administrator may change a role
--  * administrator may change any status; admin may change the status of
--    plain students (role 'user') only
--  * requests without a user JWT (SQL editor, service role / Edge
--    Function) and trusted SECURITY DEFINER functions are allowed
create or replace function public.guard_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if new.id is distinct from old.id then
    raise exception 'Profile id cannot be changed' using errcode = '42501';
  end if;

  if auth.uid() is null or coalesce(current_setting('sims.trusted', true), '') = 'on' then
    return new;
  end if;

  v_role := public.auth_role();

  if new.role is distinct from old.role then
    if v_role is distinct from 'administrator' or auth.uid() = old.id then
      raise exception 'You are not allowed to change roles' using errcode = '42501';
    end if;
  end if;

  if new.account_status is distinct from old.account_status then
    if auth.uid() = old.id then
      raise exception 'You cannot change your own account status' using errcode = '42501';
    end if;
    if not (
      v_role = 'administrator'
      or (v_role = 'admin' and old.role = 'user' and new.role = 'user')
    ) then
      raise exception 'You are not allowed to change this account status' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

-- A student record may only be linked to a plain student account.
create or replace function public.validate_student_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.profile_id is not null and not exists (
    select 1 from public.profiles p where p.id = new.profile_id and p.role = 'user'
  ) then
    raise exception 'A student record can only be linked to a student account' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.set_attendance_recorder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.recorded_by := coalesce(auth.uid(), new.recorded_by);
  else
    new.recorded_by := old.recorded_by;
  end if;
  return new;
end;
$$;

create or replace function public.set_grade_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  else
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

-- Audit trail. Only this trigger writes to activity_logs.
create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if tg_op = 'DELETE' then
    v_id := old.id;
  else
    v_id := new.id;
  end if;

  insert into public.activity_logs (actor_id, action, entity_type, entity_id)
  values (auth.uid(), lower(tg_op), tg_table_name, v_id);

  return null;
end;
$$;

create or replace function public.notify_grade_posted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile uuid;
  v_subject text;
begin
  select s.profile_id into v_profile from public.students s where s.id = new.student_id;
  if v_profile is null then
    return new;
  end if;

  select sub.subject_name into v_subject from public.subjects sub where sub.id = new.subject_id;

  insert into public.notifications (profile_id, title, message)
  values (
    v_profile,
    'New grade posted',
    format('%s - %s: %s / %s', coalesce(v_subject, 'Subject'), new.assessment_name, new.score, new.total_score)
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. TRIGGERS
-- ---------------------------------------------------------------------

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.sync_profile_email();

create trigger profiles_guard   before update on public.profiles
  for each row execute function public.guard_profile_changes();
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger students_validate_profile before insert or update of profile_id on public.students
  for each row execute function public.validate_student_profile();
create trigger students_updated before update on public.students
  for each row execute function public.set_updated_at();
create trigger teachers_updated before update on public.teachers
  for each row execute function public.set_updated_at();
create trigger grades_updated   before update on public.grades
  for each row execute function public.set_updated_at();
create trigger school_settings_updated before update on public.school_settings
  for each row execute function public.set_updated_at();

create trigger attendance_set_recorder before insert or update on public.attendance
  for each row execute function public.set_attendance_recorder();
create trigger grades_set_creator before insert or update on public.grades
  for each row execute function public.set_grade_creator();

create trigger grades_notify after insert on public.grades
  for each row execute function public.notify_grade_posted();

create trigger students_audit        after insert or update or delete on public.students
  for each row execute function public.log_activity();
create trigger teachers_audit        after insert or update or delete on public.teachers
  for each row execute function public.log_activity();
create trigger subjects_audit        after insert or update or delete on public.subjects
  for each row execute function public.log_activity();
create trigger academic_years_audit  after insert or update or delete on public.academic_years
  for each row execute function public.log_activity();
create trigger attendance_audit      after insert or update or delete on public.attendance
  for each row execute function public.log_activity();
create trigger grades_audit          after insert or update or delete on public.grades
  for each row execute function public.log_activity();
create trigger profiles_audit        after update on public.profiles
  for each row when (old.role is distinct from new.role or old.account_status is distinct from new.account_status)
  execute function public.log_activity();

-- ---------------------------------------------------------------------
-- 6. CALLABLE FUNCTIONS (RPC)
-- ---------------------------------------------------------------------

-- Registration step 2: a signed-in, email-verified student proves who they
-- are (student number + date of birth + the e-mail on the school record)
-- and the account is linked to that student record. All failures return
-- the same message so the function cannot be used to probe for records.
create or replace function public.claim_student_record(
  p_student_number text,
  p_date_of_birth  date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_profile   public.profiles%rowtype;
  v_student   public.students%rowtype;
  v_confirmed timestamptz;
  v_generic   constant text :=
    'We could not verify these details. Check your student number and date of birth, or contact the school office.';
begin
  if v_uid is null then
    raise exception 'You must be signed in' using errcode = '28000';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
  if v_profile.role <> 'user' then
    raise exception 'Only student accounts can be linked to a student record' using errcode = '42501';
  end if;
  if v_profile.account_status = 'inactive' then
    raise exception 'This account has been deactivated' using errcode = '42501';
  end if;
  if exists (select 1 from public.students where profile_id = v_uid) then
    raise exception 'This account is already linked to a student record' using errcode = '23505';
  end if;

  select u.email_confirmed_at into v_confirmed from auth.users u where u.id = v_uid;
  if v_confirmed is null then
    raise exception 'Verify your email address before linking your student record' using errcode = '42501';
  end if;

  select * into v_student
  from public.students
  where lower(student_number) = lower(trim(p_student_number))
  for update;

  if not found
     or v_student.profile_id is not null
     or v_student.enrollment_status = 'archived'
     or v_student.date_of_birth is distinct from p_date_of_birth
     or lower(v_student.email) <> lower(v_profile.email) then
    raise exception '%', v_generic using errcode = 'P0002';
  end if;

  update public.students set profile_id = v_uid where id = v_student.id;

  perform set_config('sims.trusted', 'on', true);
  update public.profiles
     set account_status = 'active',
         full_name = trim(concat_ws(' ', v_student.first_name, v_student.middle_name, v_student.last_name))
   where id = v_uid;
  perform set_config('sims.trusted', 'off', true);

  return v_student.id;
end;
$$;

-- Students may edit only their phone number and address.
create or replace function public.update_my_contact(
  p_phone   text,
  p_address text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student uuid := public.current_student_id();
begin
  if v_student is null then
    raise exception 'No student record is linked to this account' using errcode = '42501';
  end if;
  if length(coalesce(p_phone, '')) > 30 or length(coalesce(p_address, '')) > 300 then
    raise exception 'Phone or address is too long' using errcode = '22001';
  end if;

  update public.students
     set phone = nullif(trim(p_phone), ''),
         address = nullif(trim(p_address), '')
   where id = v_student;
end;
$$;

-- Dashboard numbers computed in the database (no 1000-row client limits).
create or replace function public.get_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'total_students',
      (select count(*) from public.students where enrollment_status <> 'archived'),
    'total_teachers',
      (select count(*) from public.teachers where employment_status = 'active'),
    'active_accounts',
      (select count(*) from public.profiles where account_status = 'active'),
    'average_grade',
      (select round(avg(g.score / g.total_score * 100), 2) from public.grades g),
    'attendance_by_status',
      coalesce((
        select jsonb_object_agg(a.status, a.total)
        from (
          select status, count(*) as total
          from public.attendance
          where attendance_date >= current_date - 30
          group by status
        ) a
      ), '{}'::jsonb),
    'attendance_trend',
      (select coalesce(jsonb_agg(t order by t.date), '[]'::jsonb)
       from (
         select attendance_date as date,
                count(*) filter (where status = 'present') as present,
                count(*) filter (where status = 'absent')  as absent,
                count(*) filter (where status = 'late')    as late,
                count(*) filter (where status = 'excused') as excused
         from public.attendance
         where attendance_date >= current_date - 13
         group by attendance_date
       ) t),
    'grade_by_subject',
      (select coalesce(jsonb_agg(t order by t.subject), '[]'::jsonb)
       from (
         select s.subject_name as subject,
                round(avg(g.score / g.total_score * 100), 2) as average
         from public.grades g
         join public.subjects s on s.id = g.subject_id
         group by s.subject_name
       ) t),
    'enrollment_by_grade_level',
      (select coalesce(jsonb_agg(t order by t.grade_level), '[]'::jsonb)
       from (
         select grade_level, count(*) as total
         from public.students
         where enrollment_status <> 'archived'
         group by grade_level
       ) t),
    'recent_activities',
      case when public.is_administrator() then
        (select coalesce(jsonb_agg(t), '[]'::jsonb)
         from (
           select l.id, l.action, l.entity_type, l.entity_id, l.created_at,
                  p.full_name as actor_name
           from public.activity_logs l
           left join public.profiles p on p.id = l.actor_id
           order by l.created_at desc
           limit 10
         ) t)
      else '[]'::jsonb end
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 7. TABLE PRIVILEGES
-- Supabase grants broad table privileges by default. Tighten them, then
-- let row level security decide which rows each role can touch.
-- ---------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;

-- profiles: rows are created by trigger, removed by cascade from auth.users.
-- Clients may update only these columns (role/status are further guarded
-- by the guard_profile_changes trigger and the policies below).
revoke insert, delete, update on public.profiles from authenticated;
grant update (full_name, role, account_status) on public.profiles to authenticated;

-- activity_logs: read-only for clients; written by the audit trigger only.
revoke insert, update, delete on public.activity_logs from authenticated;

-- notifications: clients may only toggle is_read.
revoke update on public.notifications from authenticated;
grant update (is_read) on public.notifications to authenticated;

-- school_settings: a single seeded row that can only be edited.
revoke insert, delete on public.school_settings from authenticated;

-- Function execution
revoke all on function public.auth_role()             from public, anon;
revoke all on function public.is_administrator()      from public, anon;
revoke all on function public.is_staff()              from public, anon;
revoke all on function public.current_student_id()    from public, anon;
revoke all on function public.claim_student_record(text, date) from public, anon;
revoke all on function public.update_my_contact(text, text)    from public, anon;
revoke all on function public.get_dashboard_stats()   from public, anon;
grant execute on function public.auth_role()          to authenticated;
grant execute on function public.is_administrator()   to authenticated;
grant execute on function public.is_staff()           to authenticated;
grant execute on function public.current_student_id() to authenticated;
grant execute on function public.claim_student_record(text, date) to authenticated;
grant execute on function public.update_my_contact(text, text)    to authenticated;
grant execute on function public.get_dashboard_stats() to authenticated;

revoke all on function public.handle_new_user()        from public, anon, authenticated;
revoke all on function public.sync_profile_email()     from public, anon, authenticated;
revoke all on function public.guard_profile_changes()  from public, anon, authenticated;
revoke all on function public.validate_student_profile() from public, anon, authenticated;
revoke all on function public.set_attendance_recorder() from public, anon, authenticated;
revoke all on function public.set_grade_creator()      from public, anon, authenticated;
revoke all on function public.log_activity()           from public, anon, authenticated;
revoke all on function public.notify_grade_posted()    from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY
-- No policy is granted to the anon role, so signed-out visitors cannot
-- read or write anything. Every policy targets `authenticated` and goes
-- through the helper functions above (no recursion).
-- ---------------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.students        enable row level security;
alter table public.teachers        enable row level security;
alter table public.subjects        enable row level security;
alter table public.academic_years  enable row level security;
alter table public.attendance      enable row level security;
alter table public.grades          enable row level security;
alter table public.activity_logs   enable row level security;
alter table public.notifications   enable row level security;
alter table public.school_settings enable row level security;

-- profiles ------------------------------------------------------------
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_select_staff on public.profiles
  for select to authenticated
  using (public.is_staff());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid() and public.auth_role() is not null)
  with check (id = auth.uid());

create policy profiles_update_administrator on public.profiles
  for update to authenticated
  using (public.is_administrator())
  with check (public.is_administrator());

create policy profiles_update_admin_for_students on public.profiles
  for update to authenticated
  using (public.auth_role() = 'admin' and role = 'user')
  with check (role = 'user');

-- students ------------------------------------------------------------
create policy students_select_staff on public.students
  for select to authenticated
  using (public.is_staff());

create policy students_select_own on public.students
  for select to authenticated
  using (id = public.current_student_id());

create policy students_insert_staff on public.students
  for insert to authenticated
  with check (public.is_staff());

create policy students_update_staff on public.students
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy students_delete_administrator on public.students
  for delete to authenticated
  using (public.is_administrator());

-- teachers ------------------------------------------------------------
create policy teachers_select_staff on public.teachers
  for select to authenticated
  using (public.is_staff());

create policy teachers_insert_staff on public.teachers
  for insert to authenticated
  with check (public.is_staff());

create policy teachers_update_staff on public.teachers
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy teachers_delete_administrator on public.teachers
  for delete to authenticated
  using (public.is_administrator());

-- subjects ------------------------------------------------------------
create policy subjects_select_active_users on public.subjects
  for select to authenticated
  using (public.auth_role() is not null);

create policy subjects_insert_staff on public.subjects
  for insert to authenticated
  with check (public.is_staff());

create policy subjects_update_staff on public.subjects
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy subjects_delete_administrator on public.subjects
  for delete to authenticated
  using (public.is_administrator());

-- academic_years --------------------------------------------------------
create policy academic_years_select_active_users on public.academic_years
  for select to authenticated
  using (public.auth_role() is not null);

create policy academic_years_insert_staff on public.academic_years
  for insert to authenticated
  with check (public.is_staff());

create policy academic_years_update_staff on public.academic_years
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy academic_years_delete_administrator on public.academic_years
  for delete to authenticated
  using (public.is_administrator());

-- attendance ------------------------------------------------------------
create policy attendance_select_staff on public.attendance
  for select to authenticated
  using (public.is_staff());

create policy attendance_select_own on public.attendance
  for select to authenticated
  using (student_id = public.current_student_id());

create policy attendance_insert_staff on public.attendance
  for insert to authenticated
  with check (public.is_staff());

create policy attendance_update_staff on public.attendance
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy attendance_delete_administrator on public.attendance
  for delete to authenticated
  using (public.is_administrator());

-- grades ------------------------------------------------------------------
create policy grades_select_staff on public.grades
  for select to authenticated
  using (public.is_staff());

create policy grades_select_own on public.grades
  for select to authenticated
  using (student_id = public.current_student_id());

create policy grades_insert_staff on public.grades
  for insert to authenticated
  with check (public.is_staff());

create policy grades_update_staff on public.grades
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy grades_delete_administrator on public.grades
  for delete to authenticated
  using (public.is_administrator());

-- activity_logs -------------------------------------------------------------
create policy activity_logs_select_administrator on public.activity_logs
  for select to authenticated
  using (public.is_administrator());

-- notifications ----------------------------------------------------------------
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (profile_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy notifications_delete_own on public.notifications
  for delete to authenticated
  using (profile_id = auth.uid());

create policy notifications_insert_staff on public.notifications
  for insert to authenticated
  with check (public.is_staff());

-- school_settings -------------------------------------------------------------------
create policy school_settings_select_active_users on public.school_settings
  for select to authenticated
  using (public.auth_role() is not null);

create policy school_settings_update_administrator on public.school_settings
  for update to authenticated
  using (public.is_administrator())
  with check (public.is_administrator());
