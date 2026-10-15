# SIMS - Student Information Management System

A school portal built with React, TypeScript, Vite and Tailwind CSS on a Supabase backend (Auth, PostgreSQL, Row Level Security).

| Role | Who | What they can do |
|---|---|---|
| **Administrator** (`administrator`) | Super administrator | Everything: accounts and roles, all school records, activity logs, school settings, permanent deletes |
| **Admin** (`admin`) | School administrator | Daily operations: students, teachers, subjects, attendance, grades, academic years, reports. Cannot change roles, read logs, edit school settings or hard-delete |
| **User** (`user`) | Student | Own profile, grades, attendance, academic history and notifications; can edit own phone and address |

Authorization is enforced **in the database** (Row Level Security, triggers and constraints). Hiding buttons is only a convenience.

> **Status:** all features are written. The code has not been compiled or run by its author's tooling (no network or database was available while writing it), so run the checks in "Verify the build" first and report any error.

## Contents
1. [Architecture](#architecture)
2. [Database and relationships](#database-and-relationships)
3. [Security model](#security-model)
4. [Setup in VS Code](#setup-in-vs-code)
5. [Verify the build](#verify-the-build)
6. [Using each role](#using-each-role)
7. [Testing](#testing) · [Deployment](#deployment)
8. [Project layout](#project-layout)
9. [Troubleshooting](#troubleshooting)
10. [Known limits](#known-limits)

## Architecture

```
Browser (React + TS) --publishable key + user JWT--> Supabase
                                                      |- Auth (email/password, verification, reset)
                                                      |- PostgreSQL + Row Level Security   <- real authorization
                                                      |- RPC functions: claim_student_record, update_my_contact,
                                                      |    get_dashboard_stats, save_attendance, set_active_academic_year
                                                      '- Edge Function create-user (service role, server side only)
```

## Database and relationships

- `profiles.id` -> `auth.users.id` (1:1). Created by a trigger, always as role `user`, status `pending`.
- `students.profile_id` -> `profiles.id` (nullable, unique): links a login to a student record.
- `teachers.profile_id` -> `profiles.id` (nullable, unique).
- `attendance`: `student_id` -> `students` (restrict), `subject_id` -> `subjects` (set null), `recorded_by` -> `profiles` (set by trigger). One row per student, date and subject (`UNIQUE NULLS NOT DISTINCT`).
- `grades`: `student_id` -> `students` (restrict), `subject_id` -> `subjects` (restrict), `teacher_id` -> `teachers` (set null), `created_by` -> `profiles` (set by trigger). `0 <= score <= total_score` is a table constraint.
- `activity_logs.actor_id` -> `profiles`; written only by audit triggers.
- `academic_years`: at most one active row (partial unique index).
- Added beyond the original table list because the features need them: `notifications` (student notifications; staff are told when a student links an account) and `school_settings` (one row, edited by the Administrator).
- Students are **archived** (`enrollment_status = 'archived'`), not deleted; `restrict` keys protect academic history.

## Security model

- RLS is on for every table. The `anon` role has no privileges and no policies.
- Helper functions `auth_role()`, `is_staff()`, `is_administrator()`, `current_student_id()` are `SECURITY DEFINER` with a fixed `search_path`, so policies never recurse into `profiles`.
- Deactivated or unverified (`pending`) accounts have no role and read no school data.
- Trigger `guard_profile_changes` blocks privilege escalation: nobody changes their own role/status, only the Administrator changes roles, an Admin may only (de)activate students. Column grants limit client updates on `profiles`.
- Public sign-up never picks a role. A student links their account with `claim_student_record(student_number, date_of_birth)`, which also requires a verified email that matches the school record and returns the same message for every failure.
- Privileged accounts are created by the `create-user` Edge Function (re-checks the caller's role server side) or by the one-time bootstrap script.
- The `service_role` key is never in the frontend; only the publishable key is.
- Activity logs: Administrator read-only, written by triggers only.

## Setup in VS Code

### 1. Install Node.js LTS
Download the LTS installer from https://nodejs.org, install, then check in a terminal: `node -v` and `npm -v`.

### 2. Open the project
Unzip the project, **File -> Open Folder...** and choose `student-information-management-system`. Open the terminal with **Terminal -> New Terminal**. Accept the recommended-extensions prompt.

### 3. Install dependencies
```bash
npm install
```

### 4. Create a Supabase project
Sign in at https://supabase.com -> **New project**. Pick a name, region and a database password (keep it in a password manager, never in the project files).

### 5. Run the SQL migrations (in order)
Dashboard -> **SQL Editor** -> **New query**. For each file, open it in VS Code, copy everything, paste it, click **Run**; each must say "Success":
1. `supabase/migrations/20261011000000_sims_schema.sql`
2. `supabase/migrations/20261012000000_stage3_functions.sql`

Use a **fresh** project: the tables (`profiles`, `students`, `grades`...) must not already exist.

### 6. Configure `.env.local`
```bash
cp .env.example .env.local        # Windows PowerShell: copy .env.example .env.local
```
- `VITE_SUPABASE_URL`: Dashboard -> **Project Settings -> Data API -> Project URL**
- `VITE_SUPABASE_PUBLISHABLE_KEY`: **Project Settings -> API Keys** -> the *publishable* key (`sb_publishable_...`), or on older projects the legacy *anon public* key.

Never use the secret / service_role key here. `.env.local` is git-ignored.

### 7. Authentication settings
Dashboard -> **Authentication**:
- **Providers -> Email**: enabled, **Confirm email** ON.
- **URL Configuration**: Site URL `http://localhost:5173`; Redirect URLs `http://localhost:5173/**` (add your live URL later).
- **Password**: minimum length 8 or more.

### 8. Create the first Administrator
1. **Authentication -> Users -> Add user -> Create new user**: your email, a strong password, tick **Auto Confirm User**.
2. Open `supabase/scripts/bootstrap_first_administrator.sql`, replace `you@example.com` with that email, paste into the SQL Editor and run. It must list one `administrator` row.

This works only from the SQL Editor; the website cannot promote anyone.

### 9. Deploy the `create-user` Edge Function
```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF     # the ref is in your project URL
npx supabase functions deploy create-user
```
Supabase injects the keys the function needs; you do not set them. Keep JWT verification on (the default).

### 10. Start the app
```bash
npm run dev
```
Open http://localhost:5173.

## Verify the build
```bash
npm run typecheck     # expect 0 errors
npm test              # expect all tests passing
npm run build         # expect a dist/ folder
```
Then run `supabase/tests/rls_tests.sql` in the SQL Editor (expect `ALL SECURITY TESTS PASSED`). See `docs/TESTING.md`.

## Using each role

**Administrator:** sign in -> School settings -> Academic years (add and set active) -> Subjects -> Teachers -> Students -> Attendance -> Grades -> Reports (CSV) -> User management -> Activity logs.

**Admin:** create one from User management (Administrator account). Same daily modules; no user management, logs, settings or delete buttons.

**Student, two ways to get an account:**
1. Staff add the student on **Students**; the student registers on `/register` with the **same email**, verifies the email, then enters student number and date of birth on `/link-student`.
2. Staff click the key icon on a student row to create the login directly (temporary password shared privately).

Student pages: Overview, My profile, My grades, My attendance, Academic history, Notifications, Account settings.

## Testing
`docs/TESTING.md` has the automated tests, the SQL security tests and a manual checklist for all three roles.

## Deployment
`docs/DEPLOYMENT.md` covers GitHub, Vercel, Supabase URL settings, email delivery and security reminders.

## Project layout
```
supabase/migrations/   schema, functions, triggers, RLS (run in order)
supabase/functions/    create-user Edge Function
supabase/scripts/      first-administrator bootstrap
supabase/tests/        rls_tests.sql (security tests)
docs/                  TESTING.md, DEPLOYMENT.md
src/lib/               supabase client, errors, constants, access rules, Zod schemas
src/context/           AuthProvider
src/services/          one module per area (auth, students, teachers, subjects, attendance, grades, reports...)
src/hooks/             useAuth, useAsyncData, useDebounce, useMyStudent, ...
src/utils/             format, csv (formula-safe), search, pagination, academic maths
src/components/        ui kit, layout (sidebar, top bar, menus), auth guards, charts, staff widgets
src/layouts/           AppLayout, role layouts, navigation
src/pages/             auth/, staff/ (shared by Administrator and Admin), student/
```

## Troubleshooting
| Symptom | Likely cause and fix |
|---|---|
| "Connect Supabase to continue" screen | `.env.local` missing or still has the example text; fill it in and restart `npm run dev` |
| Verification email never arrives | Supabase's built-in sender is rate limited; check spam, wait, or set up SMTP (see deployment guide) |
| Email link opens the wrong site | Authentication -> URL Configuration: fix Site URL and Redirect URLs |
| "Verify your student record" rejects correct details | The email on the student record must equal the registration email; check the student number and birth date |
| Signed in but "Account not active yet" | An Administrator/Admin account must be activated; students activate by linking their record |
| "You do not have permission to do that" | Row Level Security refused it; that role is not allowed to do this action |
| Create login fails | `create-user` function not deployed, or the student's email differs from the typed email |
| SQL migration fails on "already exists" | Run on a fresh project, or drop the old tables first |

## Known limits
- Grades store a grading period (Prelim, Midterm, Prefinal, Final), not a semester; reports filter by "grading period / semester".
- No passing mark is configured, so grades are shown as percentages without pass/fail colouring.
- Notifications are in-app only (no email or SMS).
- Student identity is verified by student number, birth date and the school's email on record, plus email verification.
