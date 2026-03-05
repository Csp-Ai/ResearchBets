# Setup

## 1) Start from the env template

```bash
cp .env.local.example .env.local
```

Primary template: `.env.local.example`.

## 2) Demo-safe local mode (recommended default)

```bash
npm ci
npm run env:check
npm run dev
```

Expected behavior:

- App boots without external feed keys.
- `/api/today` can resolve to deterministic `demo` or `cache` fallback mode.
- UI remains truthful and non-error-tone about feed availability.

## 3) Full mode (provider + backend)

Set these variables for full local/live behavior:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ODDS_API_KEY`
- `SPORTSDATA_API_KEY`
- `LIVE_MODE`
- `CRON_SECRET`

Legacy aliases still recognized:

- `THEODDSAPI_KEY` -> `ODDS_API_KEY`
- `SPORTSDATAIO_API_KEY` -> `SPORTSDATA_API_KEY`

## 4) Env validation behavior

Validation script: `scripts/env-check.mjs`.

- Relaxed/default: `npm run env:check`
- Strict live validation: `LIVE_MODE=true npm run env:check` (or `npm run env:check:strict`)

`LIVE_MODE` influences strictness and expectations for provider availability.

## 5) Helpful commands

```bash
npm run check
npm run verify:landing
npm run docs:check
```

## Related docs

- Route + spine semantics: [ROUTES.md](./ROUTES.md)
- Runtime precedence + diagnostics: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
