# Deploying SIMS

SIMS is a static single-page app (built by Vite) plus your Supabase project. The recommended host is Vercel; any static host that can rewrite all paths to `index.html` works.

## Before you deploy
- [ ] `npm run typecheck`, `npm test` and `npm run build` all succeed locally
- [ ] Both migrations are applied and `supabase/tests/rls_tests.sql` prints `ALL SECURITY TESTS PASSED`
- [ ] The `create-user` Edge Function is deployed
- [ ] `.env.local` is NOT committed (`git status` must not list it)

## 1. Put the code on GitHub
```bash
git init
git add .
git commit -m "SIMS"
# create an empty repository on github.com, then:
git remote add origin https://github.com/YOUR-NAME/YOUR-REPO.git
git branch -M main
git push -u origin main
```

## 2. Create the Vercel project
1. https://vercel.com -> **Add New -> Project** -> import the repository.
2. Framework preset: **Vite**. Build command `npm run build`, output directory `dist` (the defaults).
3. **Environment Variables** (Production and Preview):
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = your publishable (anon) key
   Never add the service role / secret key here.
4. Click **Deploy**. `vercel.json` already rewrites every path to `index.html`, so refreshing `/student/grades` works.

## 3. Tell Supabase about the live URL
Supabase Dashboard -> **Authentication -> URL Configuration**:
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: add `https://your-app.vercel.app/**` (keep `http://localhost:5173/**` for local work)

Without this, verification and password-reset emails link to the wrong address.

## 4. Email delivery
Supabase's built-in email sender is rate limited and meant for testing. For real students, set up your own SMTP provider under **Authentication -> SMTP Settings** (and review the email templates).

## 5. Check the live site
Run the manual checklist in `docs/TESTING.md` against the live URL, especially: sign in for each role, student registration with a real email, forgot password, and the unauthorized page for the wrong role.

## Security reminders
- Only the publishable key is in the browser. If a secret/service-role key was ever pasted into the frontend or committed, rotate it in Supabase (Project Settings -> API Keys) now.
- Keep **Confirm email** on. Do not turn off Row Level Security on any table.
- Create administrators only through the Users page or the bootstrap script, never by editing roles from the browser.
- Back up your database (Supabase -> Database -> Backups) before changing the schema; add new schema changes as new files in `supabase/migrations/`.
- In `supabase/functions/create-user/index.ts` the CORS origin is `*`. This is safe because the function also requires a valid signed-in Administrator/Admin token, but you can restrict it to your domain.

## Updating later
Push to `main`; Vercel rebuilds automatically. For database changes, add a new numbered file in `supabase/migrations/`, run it in the SQL Editor (or `supabase db push`), then deploy the app code that needs it.
