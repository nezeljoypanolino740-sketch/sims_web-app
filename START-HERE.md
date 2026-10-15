# START HERE (Simulan dito)

1. Install Node.js LTS from https://nodejs.org (then close and reopen VS Code).
2. Open this folder in VS Code: File -> Open Folder... -> choose the folder that contains `package.json`.
3. Terminal -> New Terminal, then run, one at a time:
   - `node -v` and `npm -v`  (both must print a version number)
   - `npm install`
   - `npm run typecheck`
   - `npm test`
4. Follow README.md ("Setup in VS Code", steps 4 to 10) for Supabase and `npm run dev`.
5. Run `supabase/tests/rls_tests.sql` in the Supabase SQL Editor, then follow docs/TESTING.md.

Everything is in this one folder: source code (`src/`), database files (`supabase/`), guides (`README.md`, `docs/`).
