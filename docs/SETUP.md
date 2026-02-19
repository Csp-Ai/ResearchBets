# Setup: Fresh Clone ➝ Running App

## 1) Install dependencies

```bash
npm ci
```

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
