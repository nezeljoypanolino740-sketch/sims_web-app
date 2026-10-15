# SIMS testing guide

Three layers: automated unit/component tests, SQL security tests, and a manual checklist.

## 1. Automated tests (your computer)

```bash
npm run typecheck   # TypeScript must report 0 errors
npm test            # Vitest: form rules, access rules, route guards, tables, CSV, error messages
```

What they cover:

| Area | File |
|---|---|
| Authentication form rules (password strength, confirmation, date of birth) | `src/lib/schemas/auth.test.ts` |
| Role-based redirects and route protection | `src/lib/access.test.ts`, `src/components/auth/RouteGuards.test.tsx` |
| Form validation for students, grades, school years, settings | `src/lib/schemas/entities.test.ts` |
| Error handling (duplicates, blocked deletes, permission and session errors) | `src/lib/errors.test.ts` |
| Tables, pagination, empty/error states, confirmation dialogs | `src/components/ui/DataTable.test.tsx` |
| CSV export safety, search cleaning, paging, formatting | `src/utils/utils.test.ts` |
| Grade averages and attendance maths for the student portal | `src/utils/academic.test.ts` |

## 2. Security tests (Supabase SQL Editor)

1. Run both migrations first (`supabase/migrations/`).
2. Open `supabase/tests/rls_tests.sql`, paste everything into a new SQL Editor query and click **Run**.
3. Expected result: a table with one column, `test_report`, listing every check as `PASS` and ending with `ALL SECURITY TESTS PASSED`.
4. If a check fails the query stops with an error starting with `FAIL` and the check name (for example `FAIL T3`). Send me that line.

The script runs in a transaction that is rolled back, so it leaves no data behind. It checks, among other things:

- signed-out visitors cannot read any table (T1)
- a student sees only their own student row, grades, attendance and notifications, and nobody else's (T2, T10, T22)
- students cannot edit grades or attendance, cannot promote themselves, cannot change their status or email (T3 to T5, T8, T9)
- Admin cannot change roles, delete students, read logs or edit school settings, and cannot touch the Administrator (T12, T13)
- Administrator can change roles but not their own, read logs, and delete only records without history (T18 to T21)
- a deactivated account loses access immediately (T12e to T12g)
- score limits, duplicate attendance, saving a class twice, `recorded_by` spoofing (T15 to T17)
- student registration: wrong birth date, wrong number, different email, unverified email, second claim, staff claim (T23 to T28)

If the script's first INSERT into `auth.users` is rejected by your project, create the six users in the dashboard instead and replace the setup block.

## 3. Manual checklist

Tick each box. Use a fresh browser profile or a private window per role.

### Setup
- [ ] Both migrations ran with no error; `rls_tests.sql` printed `ALL SECURITY TESTS PASSED`
- [ ] `create-user` Edge Function deployed
- [ ] First Administrator created with `bootstrap_first_administrator.sql`
- [ ] Authentication: Confirm email is ON; Site URL and redirect URLs set

### Administrator
- [ ] Wrong password shows "Incorrect email or password"
- [ ] Sign in lands on `/administrator`; refresh keeps you signed in
- [ ] Dashboard shows numbers, three charts and Recent activity
- [ ] School settings: save a school name; reload and it persists
- [ ] Academic years: add `2026-2027` 1st Semester, set it active; adding the same one again shows a friendly duplicate message
- [ ] Subjects, Teachers: add, edit, search; delete asks for confirmation
- [ ] Students: add a student with a bad school year (`2026`) and see the form error; add a valid one
- [ ] Students: archive a student, find them with the status filter, restore them
- [ ] Students: delete a student who has grades and read the "archive instead" message
- [ ] Attendance: take attendance for a class, save, change one status, save again; Records shows one entry per student
- [ ] Grades: score above total is blocked; a valid grade saves
- [ ] Reports: generate all three, export each CSV and open it in a spreadsheet
- [ ] User management: create an Admin; deactivate and reactivate it; your own row's buttons are disabled
- [ ] Activity logs list the actions above
- [ ] Profile menu: change your name and your password (wrong current password is rejected)
- [ ] Log out returns to the sign-in page; the back button does not show private pages

### Admin
- [ ] Sign in lands on `/admin`
- [ ] Menu has no User management, Activity logs or School settings
- [ ] Typing `/admin/users` or `/administrator` in the address bar shows the Unauthorized page
- [ ] No delete (trash) buttons anywhere; archive works
- [ ] Can add students, take attendance, add grades, run reports and export CSV
- [ ] Dashboard has no "Recent activity" card

### Student
- [ ] Register on `/register` with the email of an existing student record; duplicate email is refused
- [ ] Before verifying the email, signing in shows the verification message
- [ ] After verifying, `/link-student` rejects a wrong birth date with a generic message, accepts the right one
- [ ] Lands on `/student`; overview shows only your own numbers
- [ ] My profile: change phone and address; other fields are read-only
- [ ] My grades and My attendance match what staff entered; filters and paging work
- [ ] Academic history shows a card per school year and grading period
- [ ] A grade posted by staff shows up in Notifications and the bell; mark read and delete work
- [ ] `/admin`, `/administrator` and other students' data are not reachable (Unauthorized page)
- [ ] A student with no records sees empty states, not errors
- [ ] Forgot password: reset link works and the new password signs in
- [ ] Deactivate this student from the Administrator account: on the next page load they see the "Account deactivated" screen

### Errors and edge cases
- [ ] Turn off your internet and save a form: a clear error appears and the dialog stays open
- [ ] Double-click Save: only one record is created
- [ ] Open the app after the session expired: you are sent to sign-in with a message
