# Setup: Fresh Clone ➝ Running App

## 1) Install dependencies and create env

```bash
npm ci
cp .env.local.example .env.local
```

Set at least:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

## 2) Link Supabase project (optional but recommended)

```bash
npm run supabase:link
```

This is interactive and writes local Supabase project context for CLI commands.

## 3) Apply migrations to linked project

```bash
npm run supabase:push
```

For a full linked reset (destructive), use:

```bash
npm run supabase:reset
```

## 4) Verify env + schema + connectivity

```bash
npm run env:check
npm run supabase:schema:check
npm run supabase:health
```

## 5) Run app

```bash
npm run dev
```

Open:

- `http://localhost:3000/research`
- `http://localhost:3000/traces`

## Schema drift / PostgREST cache guidance

- **Remote Supabase**: run `npm run supabase:push`, wait 10–30s for PostgREST schema cache refresh, then refresh browser.
- **Local Supabase** (`SUPABASE_DB_URL` or `SUPABASE_LOCAL=true`): if mismatches persist after `npm run supabase:push`, run `supabase status` then restart stack (`supabase stop && supabase start`).

## Connectivity troubleshooting (`fetch failed`)

If `npm run supabase:schema:check` reports connectivity failures:

1. Ensure project context is linked: `npm run supabase:link`
2. Confirm `NEXT_PUBLIC_SUPABASE_URL` project ref matches linked project ref.
3. Re-run `npm run supabase:schema:check`.
