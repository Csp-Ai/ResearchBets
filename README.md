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

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

### Supabase local env setup

`.env.local` is required for local dev. Add your Supabase project URL and publishable key (used as `NEXT_PUBLIC_SUPABASE_ANON_KEY` in this app):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-publishable-key>
```

`SUPABASE_SERVICE_ROLE_KEY` is optional for local dev and must remain server-only (API routes / server code). Never expose it in client components.

After editing environment variables, restart the dev server. To verify config and connectivity, run `npm run env:check` and visit `http://localhost:3000/api/health`.

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
