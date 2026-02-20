# ResearchBets

ResearchBets is a **copilot for player prop bettors**.

North Star: **Slip ingestion ➝ leg insights ➝ auto research ➝ risk framing** so bettors can move from noisy slips to confident, traceable decisions.

## Product Loop

1. Bettor uploads or pastes a slip.
2. System extracts each leg and normalizes the market via `MarketType`.
3. UI shows market-specific context (hit rate, matchup notes, injuries, trend, risk tags).
4. Snapshot pipeline produces recommendation evidence and reasoning for follow-through.

## Canonical Prop Architecture

`MarketType` is the canonical market enum used across ingestion, persistence, measurement, and UX.

- Ingestion parsing: `src/core/slips/extract.ts`
- Snapshot composition: `src/flows/researchSnapshot/buildResearchSnapshot.ts`
- Runtime persistence: `src/core/persistence/runtimeStore.ts`
- Recommendation measurement: `src/core/measurement/recommendations.ts`
- Market normalization source of truth: `src/core/markets/marketType.ts`

## Core Components

- **SlipIngestion**: capture raw slips + normalize markets.
- **SnapshotAgent**: produce deterministic research snapshots scoped by market.
- **Graph View**: trace runtime events and orchestration nodes.
- **SnapshotReplayView**: replay per-leg prop context (trend, matchup, injury, confidence) and parlay risk summary.
- **EvidenceDrawer**: inspect claims, evidence, and event-level detail.

## LLM / Copilot Primary Context Files

Keep these files clean and declarative; they are the highest-value context for Copilot/Codex:

- `src/core/markets/marketType.ts`
- `src/flows/researchSnapshot/buildResearchSnapshot.ts`
- `src/core/slips/extract.ts`
- `src/agents/researchSnapshot/ResearchSnapshotAgent.ts`

## Runtime & Workspace Policy

- **Node.js policy**: Node 20.x (matches CI and GitHub Actions).
- **Package manager policy**: npm + `package-lock.json` are canonical.
- **Canonical Next.js app root**: `app/` (top-level). `apps/web/app` must not contain active routes.
- **Supabase mode**: local development may target hosted Supabase or local stack, but required client keys must be in `.env.local` and `SUPABASE_SERVICE_ROLE_KEY` remains server-only.

## Local Development

For the full operational path (fresh clone through schema verification and health checks), see `docs/SETUP.md`.


```bash
npm install
cp .env.local.example .env.local
npm run dev
```

### Quick start env template

A repo-local starter env is provided for onboarding:

```bash
cp .env.local.example .env.local
```

Then fill in your Supabase values in `.env.local` before running `npm run dev`.

### Supabase local env setup

`.env.local` is required for local dev. Add your Supabase project URL and publishable key (used as `NEXT_PUBLIC_SUPABASE_ANON_KEY` in this app):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-publishable-key>
```

`SUPABASE_SERVICE_ROLE_KEY` is optional for local dev and must remain server-only (API routes / server code). Never expose it in client components.

After editing environment variables, restart the dev server. To verify config and connectivity, run `npm run env:check` and visit `http://localhost:3000/api/health`.


### Trusted context provider keys (Phase 4)

To enable verified injuries/odds context in local real mode, set at least one key in each pair below in `.env.local`:

```bash
ODDS_API_KEY=<your-odds-api-key>
# or
TRUSTED_ODDS_API_KEY=<your-odds-api-key>

SPORTSDATAIO_API_KEY=<your-sportsdataio-key>
# or
TRUSTED_SPORTSDATAIO_KEY=<your-sportsdataio-key>
```

If a key is missing, trusted context now degrades gracefully and the UI shows explicit coverage/fallback messaging instead of throwing.

## Database Schema Must Be Applied

The app expects Supabase schema parity with `supabase/migrations/*.sql`. Before running local/dev against a shared project, apply migrations:

```bash
supabase db push
```

If Supabase CLI is unavailable, apply the SQL migration files manually in order from `supabase/migrations`.

Run a schema drift check anytime you see runtime DB errors:

```bash
npm run supabase:schema:check
```

### Troubleshooting: PGRST204 / 42703

If you see errors like:

- `PGRST204 Could not find column ... in schema cache`
- `42703 column ... does not exist`

Then run `npm run supabase:schema:check`, apply pending migrations, and restart the dev server.

### npm proxy warning (`Unknown env config "http-proxy"`)

If you see this warning, it is usually coming from user or CI environment variables (for example `npm_config_http_proxy`) rather than this repository. npm now expects:

- `proxy=...`
- `https-proxy=...`

If your shell/CI defines `npm_config_http_proxy`, rename it to `npm_config_proxy` (and keep `npm_config_https_proxy` as needed).

## Quality Gates

```bash
npm run lint
npm run typecheck
npm run test
```

## Research Path

Slip ingestion ➝ `buildPropLegInsight` leg context ➝ snapshot creation ➝ `/research/snapshot/[snapshotId]` replay via `SnapshotReplayView` ➝ trace replay graph (`?replay=1`).

## Security Audits

We run a production audit policy check in CI via `npm run audit:prod` (allowlist-aware) as a blocking gate for non-allowlisted (or expired) production advisories.

Run audits locally with:

```bash
npm run audit:prod
npm run audit:all
```

Allowlist exceptions must include explicit expiry dates and short remediation windows.

Do **not** run `npm audit fix --force` on `main` without an explicit **Dependency Major Upgrade** PR, because force-fixes can introduce breaking major upgrades across the stack.
