# Database development

The ordered files under `migrations/` create the relational schema, RLS, an atomic upload RPC and the curated catalog. They are prepared source files; no hosted database changes have been applied.

`npm test` uses PGlite to execute the exact migrations in an isolated PostgreSQL instance, with a minimal local `auth.users`/`auth.uid()` stand-in. Tests exercise anonymous access, two users, insert/update/delete isolation, cross-owner foreign keys, load-unit integrity, catalog write rejection, atomic rollback, duplicate upload and revision ordering. This does not replace Supabase Auth/PostgREST integration testing.

For the real local Supabase stack, install/start Docker Desktop, then from the repository root:

```powershell
npx supabase@latest start
npx supabase@latest migration up --local
npx supabase@latest status
```

`start` initializes a new local database with migrations. `migration up --local` applies unapplied migrations to an existing local stack. Do not reset an existing database containing data you need. Local Studio is at `http://127.0.0.1:54323`. Use the local public publishable key (not the secret/service-role key).

For an iPhone on your LAN, the local API URL must use your computer's LAN address, not `localhost`. Port 54321 must be reachable from the phone; use only a trusted development network. If local CLI output only offers legacy anon JWT keys, obtain/configure a publishable key before using this app's strict client-key guard. Local Docker integration was not run in this implementation session because Docker was unavailable.

Hosted rollout is a separate approval step. Review all migration files, test against a disposable local stack, and inspect existing hosted schema before an approved rollout. Do not use `supabase link`, `db push`, hosted SQL Editor, or a migration tool against the hosted project without explicit approval. App installation/startup never applies PostgreSQL migrations. After an approved rollout, set the write flag in the root `.env.local` and restart Metro before testing Auth/live upload.
