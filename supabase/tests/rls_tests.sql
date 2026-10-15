-- =====================================================================
-- SIMS security tests (Row Level Security, triggers, constraints, RPCs)
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste this
-- whole file -> Run. Run both migrations first.
--
-- Everything happens inside one transaction that ends with ROLLBACK, so
-- no test data stays in your database. If any check fails, the query stops
-- with an error that starts with "FAIL" and names the check. If everything
-- passes, the last result is a "test_report" with one PASS line per check.
--
-- The script creates throw-away users directly in auth.users. If your
-- project rejects that insert, create the six users in the dashboard
-- (Authentication -> Users) and adapt the setup block.
-- =====================================================================

begin;

do $test$
declare
  v_log   text := '';
  n       integer;
  t       text;
  j       jsonb;
  rid     uuid;
  v_super uuid := gen_random_uuid();   -- administrator
  v_admin uuid := gen_random_uuid();   -- admin
  v_a     uuid := gen_random_uuid();   -- student A (linked)
  v_b     uuid := gen_random_uuid();   -- student B (linked)
  v_new   uuid := gen_random_uuid();   -- verified, not yet linked (student C)
  v_unv   uuid := gen_random_uuid();   -- email NOT verified (student D)
  s_a     uuid := gen_random_uuid();
  s_b     uuid := gen_random_uuid();
  s_c     uuid := gen_random_uuid();
  s_d     uuid := gen_random_uuid();
  s_e     uuid;
  v_subj  uuid := gen_random_uuid();
begin
  -- ------------------------------------------------------------------
  -- SETUP (runs as the SQL editor's postgres role)
  -- ------------------------------------------------------------------
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change, email_change_token_new)
  select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, '', u.confirmed,
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
  from (values
    (v_super, 'super@sims.test',      now()),
    (v_admin, 'admin@sims.test',      now()),
    (v_a,     'a@sims.test',          now()),
    (v_b,     'b@sims.test',          now()),
    (v_new,   'new@sims.test',        now()),
    (v_unv,   'unverified@sims.test', null::timestamptz)
  ) as u(id, email, confirmed);

  -- The sign-up trigger must have created every profile as role user / status pending.
  select count(*) into n from public.profiles
   where id in (v_super, v_admin, v_a, v_b, v_new, v_unv) and role = 'user' and account_status = 'pending';
  if n <> 6 then raise exception 'FAIL S0: sign-up trigger must create role user / pending profiles (got %)', n; end if;
  v_log := v_log || E'PASS S0 new sign-ups start as pending students\n';

  update public.profiles set role = 'administrator', account_status = 'active' where id = v_super;
  update public.profiles set role = 'admin',         account_status = 'active' where id = v_admin;
  update public.profiles set account_status = 'active' where id in (v_a, v_b);

  insert into public.students (id, student_number, profile_id, first_name, last_name, date_of_birth, email, grade_level, section, school_year) values
    (s_a, 'T-A', v_a, 'Alice', 'Alpha', '2010-01-01', 'a@sims.test', 'Grade 7', 'Rizal', '2026-2027'),
    (s_b, 'T-B', v_b, 'Ben',   'Beta',  '2010-02-02', 'b@sims.test', 'Grade 7', 'Rizal', '2026-2027'),
    (s_c, 'T-C', null, 'Cara', 'Gamma', '2010-03-03', 'new@sims.test', 'Grade 7', 'Rizal', '2026-2027'),
    (s_d, 'T-D', null, 'Dan',  'Delta', '2010-04-04', 'unverified@sims.test', 'Grade 7', 'Rizal', '2026-2027');

  insert into public.subjects (id, subject_code, subject_name) values (v_subj, 'T-SUBJ', 'Test Subject');
  insert into public.grades (student_id, subject_id, grading_period, school_year, assessment_name, score, total_score) values
    (s_a, v_subj, 'Prelim', '2026-2027', 'Setup quiz A', 8, 10),
    (s_b, v_subj, 'Prelim', '2026-2027', 'Setup quiz B', 6, 10);
  insert into public.attendance (student_id, attendance_date, status) values
    (s_a, current_date, 'present'),
    (s_b, current_date, 'absent');

  -- ------------------------------------------------------------------
  -- T1  signed-out visitors (anon) can read nothing
  -- ------------------------------------------------------------------
  execute 'set local role anon';
    begin
      perform 1 from public.students limit 1;
      raise exception 'FAIL T1 anon cannot read students: no error was raised';
    exception when insufficient_privilege then
      v_log := v_log || E'PASS T1 anon cannot read students\n';
    end;
    begin
      perform 1 from public.grades limit 1;
      raise exception 'FAIL T1 anon cannot read grades: no error was raised';
    exception when insufficient_privilege then
      v_log := v_log || E'PASS T1 anon cannot read grades\n';
    end;
    begin
      perform 1 from public.attendance limit 1;
      raise exception 'FAIL T1 anon cannot read attendance: no error was raised';
    exception when insufficient_privilege then
      v_log := v_log || E'PASS T1 anon cannot read attendance\n';
    end;
    begin
      perform 1 from public.profiles limit 1;
      raise exception 'FAIL T1 anon cannot read profiles: no error was raised';
    exception when insufficient_privilege then
      v_log := v_log || E'PASS T1 anon cannot read profiles\n';
    end;
    begin
      perform 1 from public.teachers limit 1;
      raise exception 'FAIL T1 anon cannot read teachers: no error was raised';
    exception when insufficient_privilege then
      v_log := v_log || E'PASS T1 anon cannot read teachers\n';
    end;
    begin
      perform 1 from public.activity_logs limit 1;
      raise exception 'FAIL T1 anon cannot read activity_logs: no error was raised';
    exception when insufficient_privilege then
      v_log := v_log || E'PASS T1 anon cannot read activity_logs\n';
    end;
    execute 'reset role';
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claim.role', '', true);

  -- T2..T10  student A
    perform set_config('request.jwt.claims', json_build_object('sub', v_a::text, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_a::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    execute 'set local role authenticated';
    select count(*) from public.students into n;
    if not (n = 1) then raise exception 'FAIL T2a student A sees only their own student row: count was %', n; end if;
    v_log := v_log || E'PASS T2a student A sees only their own student row\n';
    select count(*) from public.grades into n;
    if not (n = 1) then raise exception 'FAIL T2b student A sees only their own grades: count was %', n; end if;
    v_log := v_log || E'PASS T2b student A sees only their own grades\n';
    select count(*) from public.attendance into n;
    if not (n = 1) then raise exception 'FAIL T2c student A sees only their own attendance: count was %', n; end if;
    v_log := v_log || E'PASS T2c student A sees only their own attendance\n';
    select count(*) from public.profiles where id <> v_a into n;
    if not (n = 0) then raise exception 'FAIL T2d student A cannot read other profiles: count was %', n; end if;
    v_log := v_log || E'PASS T2d student A cannot read other profiles\n';
    select count(*) from public.grades where student_id = s_b into n;
    if not (n = 0) then raise exception 'FAIL T2e student A cannot read student B grades: count was %', n; end if;
    v_log := v_log || E'PASS T2e student A cannot read student B grades\n';
    update public.grades set score = total_score where student_id = s_a;
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'FAIL T3 student A cannot edit grades: expected 0 rows affected, got %', n; end if;
    v_log := v_log || E'PASS T3 student A cannot edit grades\n';
    begin
      insert into public.grades (student_id, subject_id, grading_period, school_year, assessment_name, score, total_score) values (s_a, v_subj, 'Prelim', '2026-2027', 'Hack', 10, 10);
      raise exception 'FAIL T4a student A cannot insert a grade: no error was raised';
    exception when insufficient_privilege then
      v_log := v_log || E'PASS T4a student A cannot insert a grade\n';
    end;
    begin
      insert into public.attendance (student_id, attendance_date, status) values (s_a, current_date - 5, 'present');
      raise exception 'FAIL T4b student A cannot insert attendance: no error was raised';
    exception when insufficient_privilege then
      v_log := v_log || E'PASS T4b student A cannot insert attendance\n';
    end;
    begin
      update public.profiles set role = 'administrator' where id = v_a;
      raise exception 'FAIL T5a student A cannot promote themselves: no error was raised';
    exception when insufficient_privilege then
      v_log := v_log || E'PASS T5a student A cannot promote themselves\n';
    end;
    begin
      update public.profiles set account_status = 'inactive' where id = v_a;
      raise exception 'FAIL T5b student A cannot reactivate/deactivate themselves: no error was raised';
    exception when insufficient_privilege then
      v_log := v_log || E'PASS T5b student A cannot reactivate/deactivate themselves\n';
    end;
    begin
      update public.profiles set email = 'evil@sims.test' where id = v_a;
      raise exception 'FAIL T5c student A cannot edit their email column: no error was raised';
    exception when insufficient_privilege then
      v_log := v_log || E'PASS T5c student A cannot edit their email column\n';
    end;
    begin
      perform public.get_dashboard_stats();
      raise exception 'FAIL T6 student A cannot read dashboard stats: no error was raised';
    exception when insufficient_privilege then
      v_log := v_log || E'PASS T6 student A cannot read dashboard stats\n';
    end;
    perform public.update_my_contact('0917 000 1111', 'Test Street 1');
    select phone into t from public.students where id = s_a;
    if t is distinct from '0917 000 1111' then raise exception 'FAIL T7: update_my_contact did not save'; end if;
    v_log := v_log || E'PASS T7 student A can update their own phone and address\n';
    update public.students set grade_level = 'Grade 12' where id = s_a;
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'FAIL T8 student A cannot edit student rows directly: expected 0 rows affected, got %', n; end if;
    v_log := v_log || E'PASS T8 student A cannot edit student rows directly\n';
    begin
      insert into public.activity_logs (action, entity_type) values ('x', 'y');
      raise exception 'FAIL T9 student A cannot write activity logs: no error was raised';
    exception when insufficient_privilege then
      v_log := v_log || E'PASS T9 student A cannot write activity logs\n';
    end;
    select count(*) from public.notifications where profile_id = v_b into n;
    if not (n = 0) then raise exception 'FAIL T10a student A cannot read B notifications: count was %', n; end if;
    v_log := v_log || E'PASS T10a student A cannot read B notifications\n';
    select count(*) from public.notifications where profile_id = v_a into n;
    if not (n >= 1) then raise exception 'FAIL T10b student A has own grade notification: count was %', n; end if;
    v_log := v_log || E'PASS T10b student A has own grade notification\n';
    execute 'reset role';
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claim.role', '', true);

  -- T11..T17  admin (school administrator)
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_admin::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    execute 'set local role authenticated';
    select count(*) from public.students into n;
    if not (n >= 4) then raise exception 'FAIL T11 admin sees all students: count was %', n; end if;
    v_log := v_log || E'PASS T11 admin sees all students\n';
    insert into public.students (student_number, first_name, last_name, date_of_birth, email, grade_level, school_year)
    values ('T-E', 'Eve', 'Epsilon', '2010-05-05', 'e@sims.test', 'Grade 7', '2026-2027') returning id into s_e;
    v_log := v_log || E'PASS T11b admin can add a student\n';
    begin
      update public.profiles set role = 'admin' where id = v_a;
      raise exception 'FAIL T12a admin cannot change a role: no error was raised';
    exception when insufficient_privilege then
      v_log := v_log || E'PASS T12a admin cannot change a role\n';
    end;
    begin
      update public.profiles set account_status = 'inactive' where id = v_admin;
      raise exception 'FAIL T12b admin cannot change their own status: no error was raised';
    exception when insufficient_privilege then
      v_log := v_log || E'PASS T12b admin cannot change their own status\n';
    end;
    update public.profiles set account_status = 'inactive' where id = v_super;
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'FAIL T12c admin cannot deactivate the administrator: expected 0 rows affected, got %', n; end if;
    v_log := v_log || E'PASS T12c admin cannot deactivate the administrator\n';
    update public.profiles set account_status = 'inactive' where id = v_a;
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'FAIL T12d admin can deactivate a student account: expected 1 rows affected, got %', n; end if;
    v_log := v_log || E'PASS T12d admin can deactivate a student account\n';
    delete from public.students where id = s_b;
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'FAIL T13a admin cannot permanently delete students: expected 0 rows affected, got %', n; end if;
    v_log := v_log || E'PASS T13a admin cannot permanently delete students\n';
    select count(*) from public.activity_logs into n;
    if not (n = 0) then raise exception 'FAIL T13b admin cannot read activity logs: count was %', n; end if;
    v_log := v_log || E'PASS T13b admin cannot read activity logs\n';
    update public.school_settings set school_name = 'Hacked';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'FAIL T13c admin cannot edit school settings: expected 0 rows affected, got %', n; end if;
    v_log := v_log || E'PASS T13c admin cannot edit school settings\n';
    j := public.get_dashboard_stats();
    if (j ->> 'total_students')::int < 4 then raise exception 'FAIL T13d: dashboard stats look wrong'; end if;
    if jsonb_array_length(j -> 'recent_activities') <> 0 then raise exception 'FAIL T13e: admin must not receive recent activities'; end if;
    v_log := v_log || E'PASS T13d admin gets dashboard stats without activity logs\n';
    insert into public.grades (student_id, subject_id, grading_period, school_year, assessment_name, score, total_score)
    values (s_a, v_subj, 'Midterm', '2026-2027', 'Admin quiz', 9, 10);
    v_log := v_log || E'PASS T14 admin can add a grade\n';
    begin
      insert into public.grades (student_id, subject_id, grading_period, school_year, assessment_name, score, total_score) values (s_a, v_subj, 'Final', '2026-2027', 'Bad', 11, 10);
      raise exception 'FAIL T15a score above total is rejected: no error was raised';
    exception when check_violation then
      v_log := v_log || E'PASS T15a score above total is rejected\n';
    end;
    begin
      insert into public.grades (student_id, subject_id, grading_period, school_year, assessment_name, score, total_score) values (s_a, v_subj, 'Final', '2026-2027', 'Bad', -1, 10);
      raise exception 'FAIL T15b negative score is rejected: no error was raised';
    exception when check_violation then
      v_log := v_log || E'PASS T15b negative score is rejected\n';
    end;
    begin
      insert into public.attendance (student_id, attendance_date, status) values (s_a, current_date, 'late');
      raise exception 'FAIL T15c duplicate whole-day attendance is rejected: no error was raised';
    exception when unique_violation then
      v_log := v_log || E'PASS T15c duplicate whole-day attendance is rejected\n';
    end;
    perform public.save_attendance(jsonb_build_array(jsonb_build_object(
      'student_id', s_a, 'subject_id', '', 'attendance_date', current_date::text, 'status', 'late', 'remarks', 'bus')));
    select count(*) into n from public.attendance where student_id = s_a and attendance_date = current_date;
    select status into t from public.attendance where student_id = s_a and attendance_date = current_date;
    if n <> 1 or t <> 'late' then raise exception 'FAIL T16: save_attendance must update, not duplicate (rows %, status %)', n, t; end if;
    v_log := v_log || E'PASS T16 save_attendance updates the existing entry instead of duplicating\n';
    insert into public.attendance (student_id, attendance_date, status, recorded_by)
    values (s_b, current_date - 1, 'present', v_super) returning recorded_by into rid;
    if rid <> v_admin then raise exception 'FAIL T17: recorded_by must be the signed-in user, not a spoofed value'; end if;
    v_log := v_log || E'PASS T17 recorded_by cannot be spoofed\n';
    execute 'reset role';
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claim.role', '', true);

  -- T12e  a deactivated student loses access (but can still see their own profile)
    perform set_config('request.jwt.claims', json_build_object('sub', v_a::text, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_a::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    execute 'set local role authenticated';
    select count(*) from public.students into n;
    if not (n = 0) then raise exception 'FAIL T12e deactivated student sees no student rows: count was %', n; end if;
    v_log := v_log || E'PASS T12e deactivated student sees no student rows\n';
    select count(*) from public.grades into n;
    if not (n = 0) then raise exception 'FAIL T12f deactivated student sees no grades: count was %', n; end if;
    v_log := v_log || E'PASS T12f deactivated student sees no grades\n';
    select count(*) from public.profiles where id = v_a into n;
    if not (n = 1) then raise exception 'FAIL T12g deactivated student can still read own profile: count was %', n; end if;
    v_log := v_log || E'PASS T12g deactivated student can still read own profile\n';
    execute 'reset role';
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claim.role', '', true);
    update public.profiles set account_status = 'active' where id = v_a;

  -- T18..T21  administrator
    perform set_config('request.jwt.claims', json_build_object('sub', v_super::text, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_super::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    execute 'set local role authenticated';
    update public.profiles set role = 'administrator' where id = v_admin;
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'FAIL T18a administrator can change a role: expected 1 rows affected, got %', n; end if;
    v_log := v_log || E'PASS T18a administrator can change a role\n';
    update public.profiles set role = 'admin' where id = v_admin;
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'FAIL T18b administrator can change it back: expected 1 rows affected, got %', n; end if;
    v_log := v_log || E'PASS T18b administrator can change it back\n';
    begin
      update public.profiles set role = 'admin' where id = v_super;
      raise exception 'FAIL T18c administrator cannot change their own role: no error was raised';
    exception when insufficient_privilege then
      v_log := v_log || E'PASS T18c administrator cannot change their own role\n';
    end;
    select count(*) from public.activity_logs into n;
    if not (n > 0) then raise exception 'FAIL T19a administrator can read activity logs: count was %', n; end if;
    v_log := v_log || E'PASS T19a administrator can read activity logs\n';
    j := public.get_dashboard_stats();
    if jsonb_array_length(j -> 'recent_activities') = 0 then raise exception 'FAIL T19b: administrator should see recent activities'; end if;
    v_log := v_log || E'PASS T19b administrator sees recent activities\n';
    begin
      delete from public.students where id = s_b;
      raise exception 'FAIL T20a deleting a student with grades is blocked: no error was raised';
    exception when foreign_key_violation then
      v_log := v_log || E'PASS T20a deleting a student with grades is blocked\n';
    end;
    delete from public.students where id = s_e;
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'FAIL T20b administrator can delete a student without records: expected 1 rows affected, got %', n; end if;
    v_log := v_log || E'PASS T20b administrator can delete a student without records\n';
    update public.school_settings set school_name = 'Test School';
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'FAIL T21 administrator can edit school settings: expected 1 rows affected, got %', n; end if;
    v_log := v_log || E'PASS T21 administrator can edit school settings\n';
    execute 'reset role';
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claim.role', '', true);

  -- T22  student A now sees the notification created by the admin's grade, and still not B's
    perform set_config('request.jwt.claims', json_build_object('sub', v_a::text, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_a::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    execute 'set local role authenticated';
    select count(*) from public.notifications where title = 'New grade posted' into n;
    if not (n >= 2) then raise exception 'FAIL T22 student A received 2 grade notifications: count was %', n; end if;
    v_log := v_log || E'PASS T22 student A received 2 grade notifications\n';
    execute 'reset role';
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claim.role', '', true);

  -- T23..T27  claiming a student record (registration step 2)
    perform set_config('request.jwt.claims', json_build_object('sub', v_new::text, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_new::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    execute 'set local role authenticated';
    begin
      perform public.claim_student_record('T-C', date '2000-01-01');
      raise exception 'FAIL T23a wrong date of birth is rejected: no error was raised';
    exception when no_data_found then
      v_log := v_log || E'PASS T23a wrong date of birth is rejected\n';
    end;
    begin
      perform public.claim_student_record('NOPE', date '2010-03-03');
      raise exception 'FAIL T23b unknown student number is rejected: no error was raised';
    exception when no_data_found then
      v_log := v_log || E'PASS T23b unknown student number is rejected\n';
    end;
    begin
      perform public.claim_student_record('T-D', date '2010-04-04');
      raise exception 'FAIL T23c record with a different email is rejected: no error was raised';
    exception when no_data_found then
      v_log := v_log || E'PASS T23c record with a different email is rejected\n';
    end;
    rid := public.claim_student_record('T-C', date '2010-03-03');
    if rid <> s_c then raise exception 'FAIL T24: claim returned the wrong student'; end if;
    v_log := v_log || E'PASS T24 matching number + birth date + email links the account\n';
    begin
      perform public.claim_student_record('T-C', date '2010-03-03');
      raise exception 'FAIL T25 a second claim is rejected: no error was raised';
    exception when unique_violation then
      v_log := v_log || E'PASS T25 a second claim is rejected\n';
    end;
    select count(*) from public.students into n;
    if not (n = 1) then raise exception 'FAIL T25b the new student can now read their own record: count was %', n; end if;
    v_log := v_log || E'PASS T25b the new student can now read their own record\n';
    execute 'reset role';
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claim.role', '', true);
    select count(*) into n from public.notifications where profile_id = v_super and title = 'Student account linked';
    if n < 1 then raise exception 'FAIL T26: staff must be notified when a student links their account'; end if;
    v_log := v_log || E'PASS T26 staff are notified when a student links their account\n';
    perform set_config('request.jwt.claims', json_build_object('sub', v_unv::text, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_unv::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    execute 'set local role authenticated';
    begin
      perform public.claim_student_record('T-D', date '2010-04-04');
      raise exception 'FAIL T27 an unverified email cannot claim a record: no error was raised';
    exception when insufficient_privilege then
      v_log := v_log || E'PASS T27 an unverified email cannot claim a record\n';
    end;
    execute 'reset role';
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claim.role', '', true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_admin::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    execute 'set local role authenticated';
    begin
      perform public.claim_student_record('T-D', date '2010-04-04');
      raise exception 'FAIL T28 staff accounts cannot claim a student record: no error was raised';
    exception when insufficient_privilege then
      v_log := v_log || E'PASS T28 staff accounts cannot claim a student record\n';
    end;
    execute 'reset role';
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claim.role', '', true);

  perform set_config('sims.test_report', v_log || E'ALL SECURITY TESTS PASSED', true);
end
$test$;

select current_setting('sims.test_report') as test_report;

rollback;
