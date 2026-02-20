# Setup: Fresh Clone ➝ Running App

## Runtime policy

- Node.js: **20.x**
- Package manager: **npm** (`package-lock.json` is authoritative)
- Canonical Next app root: **`app/`**
- Supabase mode: hosted or local; either way, never expose `SUPABASE_SERVICE_ROLE_KEY` to client components.

## 1) Install dependencies

```bash
npm ci
```

## 1.1) Bootstrap local env file

Copy the template before running local commands:

```bash
cp .env.example .env.local
```

If you already ran `npm run supabase:setup`, keep your generated values and only fill any missing keys used by your workflow.

## 2) One-time Supabase setup (recommended)

```bash
npm run supabase:setup
```

This command will:

- verify Supabase CLI + auth,
- link your local repo to project `gbkjalflukfkixsrjfiq`,
- fetch API keys via Supabase Management API and generate/update `.env.local` with required variables,
- run `npm run env:check` and `npm run supabase:health`.

For CI/non-interactive environments:

```bash
npm run supabase:setup:ci
```

This mode fails if required keys are missing instead of prompting.

> Setup now requires a Supabase access token only once (`SUPABASE_ACCESS_TOKEN` or `SUPABASE_TOKEN`).
> The script also auto-discovers the CLI token from local auth stores on macOS/Linux/Windows when available.

## 3) Required environment values

After setup, these keys should exist in `.env.local`:

- `EXPO_PUBLIC_SUPABASE_URL=https://gbkjalflukfkixsrjfiq.supabase.co`
- `EXPO_PUBLIC_SUPABASE_KEY=<publishable key>`
- `NEXT_PUBLIC_SUPABASE_URL=https://gbkjalflukfkixsrjfiq.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<publishable key>`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key (back-compat)>`
- `SUPABASE_SERVICE_ROLE_KEY=<service role key>` (**server only**)
- `DATABASE_URL=postgresql://postgres.gbkjalflukfkixsrjfiq:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
- `DIRECT_URL=postgresql://postgres.gbkjalflukfkixsrjfiq:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres`

### Why DB URLs use `[YOUR-PASSWORD]`

Supabase never exposes your DB password through client keys. Get it from:

- Supabase Dashboard → Project Settings → Database → Connection string / reset password.

Replace `[YOUR-PASSWORD]` locally only.

## 4) Windows notes (PowerShell)

Install Supabase CLI with Scoop:

```powershell
scoop install supabase
```

If `supabase:setup` reports auth issues, run:

```powershell
supabase login
```

The setup script uses Node-based npm invocation paths to avoid common PowerShell `spawnSync npm ENOENT` issues.

## 5) Apply migrations and verify health manually (if needed)

```bash
npm run supabase:push
npm run env:check
npm run supabase:health
```

If schema check says missing `inspect_public_columns` RPC, `npm run supabase:setup` now attempts `supabase db push --include-all --yes` automatically, waits for PostgREST cache refresh, and retries once.

## 6) Run app

```bash
npm run dev
```

Open:

- `http://localhost:3000/research`
- `http://localhost:3000/traces`

## Security

- Never commit `.env.local`, `.env.expo`, or service role secrets.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` via `NEXT_PUBLIC_*` variables.

## Schema baseline policy

- Canonical baseline: `supabase/schema.sql`.
- Mirror baseline: `db/supabase/schema.sql` (must stay byte-for-byte identical).
- Before commit/PR, run `npm run supabase:schema:drift-check` to prevent drift.
- If you update canonical schema, copy it to mirror in the same commit.

## 7) Minimum variables by workflow

### Run dev server (`npm run dev`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Run Project Mirror indexer (`npm run dev:mirror:index`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

### Use `/dev/mirror` chat UI
- Development runtime (`NODE_ENV=development`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- Optional: `ADMIN_SECRET_KEY` (if set, send it in `x-admin-secret`)

## 8) Deploy to Vercel (pre-launch hardening checklist)

1. Add required env vars in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (**server only, never `NEXT_PUBLIC_`**)
   - `SPORTSDATAIO_API_KEY` (optional for live providers)
   - `ODDS_API_KEY` (required for live odds mode)
   - `CRON_SECRET` (required for cron auth)
   - `LIVE_MODE=false` (recommended default until all provider keys are confirmed)
2. Confirm Next.js env variable rule: only `NEXT_PUBLIC_*` values are exposed to browser bundles at build time.
3. Deploy and verify `/dev/mirror` and other `/dev/*` routes return 404 in production.
4. Verify cron call uses `x-cron-secret: $CRON_SECRET`.
5. Verify bettor UX remains safe when provider keys are missing: app should fall back to demo data instead of crashing.

### Vercel WAF note

This repo now includes a best-effort in-process rate limiter for key POST endpoints. For stronger production protection, enable Vercel WAF rate limiting rules at the edge.
