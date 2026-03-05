# Repo Systems Audit (Connected • Levered • Drift-Resistant)

## Executive Summary
ResearchBets is mostly connected around a canonical spine (`trace_id`, `mode`, `sport`, `tz`, `date`) and centralized env contracts, with healthy provider diagnostics (`/api/provider-health` reports `live_ok` when configured). The strongest foundations are: (1) a shared nervous-system URL contract (`normalizeSpine`/`toHref`), (2) centralized provider registry resolution (`getProviderRegistry`), and (3) additive-safe telemetry envelopes with non-blocking analytics degradation handling.

Current drift risk is concentrated in a few parallel primitives and bypasses: `appendQuery` is used directly in many API fetch/link paths (instead of spine helpers), `buildRedirectWithQuery` can forward non-canonical keys without normalization, and mode resolution logic exists in multiple stacks (`live/modeResolver`, `mode/policy`, ad hoc UI mode defaults). No immediate P0 breakage found from static inspection, but there are several P1/P2 opportunities to tighten drift guards before additional feature work.

---

## A. System Topology Map

### Entry surfaces
- `/` → `app/page.tsx` → `CanonicalLanding` → `app/cockpit/CockpitLandingClient.tsx`
- `/cockpit` → same canonical landing client
- `/today` → `app/(product)/today/page.tsx` (server fetches `/api/today` via `toHref`)
- `/slip` → `app/(product)/slip/page.tsx` + `SlipPageClient`
- `/track` → `app/(product)/track/page.tsx` + `TrackPageClient`
- `/traces/[trace_id]` → dev-only detail page (gated by `NODE_ENV`)
- `/live` → alias route redirects to `/control?tab=live` using `toHref`
- `/landing` → redirects to `/` via `buildRedirectWithQuery`

### API surfaces by domain
- **Today/board**: `/api/today`
- **Slips/runs**: `/api/slips/submit`, `/api/slips/extract`, `/api/slips/parseText`, `/api/slips/recent`, `/api/run/stress-test`
- **Telemetry/events**: `/api/events`, `/api/telemetry/summary`, `/api/edge/report`, `/api/edge/scorecard`
- **Live**: `/api/live/market`, `/api/live/model`, `/api/live/tickets`, `/api/live/props/track`
- **Odds/providers**: `/api/odds/probe`, `/api/odds/refresh`, `/api/provider-health`
- **Stats/outcomes/measurement**: `/api/metrics/calibration`, `/api/results/ingest`, `/api/outcomes/log`, `/api/settlement/run`
- **Health/diagnostics**: `/api/health`, `/api/env/status`
- **Admin/dev**: `/api/governor/report`, `/api/cron/settle-bets`, `/api/experiments/assign`

### Core libraries (`src/core/*`) by purpose
- **Env contract**: `src/core/env/{keys.ts,read.server.ts,runtime.server.ts}`
- **Spine/nervous routing**: `src/core/nervous/{spine.ts,routes.ts}`, `src/components/nervous/NervousSystemContext.tsx`, `src/core/contracts/contextSpine.ts`
- **Providers**: `src/core/providers/{registry.server.ts,theoddsapi.ts,sportsdataio.ts,oddsProbe.server.ts}`
- **Today/board**: `src/core/today/service.server.ts`, `src/core/board/boardService.server.ts`
- **Slips/intelligence**: `src/core/slips/*`, `src/core/pipeline/runSlip.ts`
- **Run/store DTOs**: `src/core/run/*`, `src/core/persistence/*`
- **Telemetry/events**: `src/core/control-plane/{events.ts,emitter.ts}`
- **Routing helpers**: `src/core/routing/preserveQueryRedirect.ts`, `src/components/landing/navigation.ts`

### Data persistence layer (Supabase + DTO mapping)
- **Supabase clients**:
  - Browser: `src/core/supabase/browser.ts`
  - Server (SSR): `src/core/supabase/server.ts`
  - Service role: `src/core/supabase/service.ts`
- **Runtime store provider**: `src/core/persistence/runtimeStoreProvider.ts` chooses memory vs supabase
- **Supabase tables** (from `SupabaseRuntimeStore`):
  - `runtime_sessions`, `research_reports`, `bets`, `events_analytics`, `idempotency_keys`, `ai_recommendations`, `odds_snapshots`, `game_results`, `recommendation_outcomes`, `experiments`, `experiment_assignments`, `web_cache`, `slip_submissions`, `insight_nodes`, `outcome_snapshots`, `edge_realized`, `slip_outcomes`, `tracked_props`
- **Reads/writes** occur through `src/core/persistence/supabaseRuntimeStore.ts` (plus in-memory test backend in `runtimeDb.ts`)

## B. Canonical Contract Spine Verification

### Spine reads
- URL/query parse: `normalizeSpine`, `parseSpineFromSearch` (`src/core/nervous/spine.ts`)
- Request context: `spineFromRequest` (`src/core/contracts/contextSpine.ts`) accepts aliases `trace`, `traceId`, `dateISO`, `anon_id`, etc.
- Header/request context: route-level trace fallbacks in APIs like `/api/events` via `getTraceContext`

### Spine writes
- `toHref` (`src/core/nervous/routes.ts`) canonical builder with normalize+serialize
- `withTraceId` (`src/core/trace/queryTrace.ts`) wraps `appendQuery`
- `appendQuery` (`src/components/landing/navigation.ts`) generic query mutation helper

### Drift findings
1. **Parallel URL builders are active**: `appendQuery` and `buildRedirectWithQuery` can bypass full spine normalization (especially in client fetch/query composition).  
2. **Legacy param acceptance is broad but uneven**: `trace|traceId` is normalized in spine/context helpers, but some surfaces still manually read query params and may not normalize aliases consistently.  
3. **Direct absolute href usage exists** (`/traces` links in settings/dev/trace detail), bypassing `toHref` and potentially dropping spine continuity.

## C. Provider Stack Verification

### Odds provider
- Base URL normalization: `resolveOddsApiBaseUrl` strips trailing slash (`theoddsapi.ts`)
- Key resolution: canonical+alias via `resolveWithAliases(CANONICAL_KEYS.ODDS_API_KEY, ALIAS_KEYS...)`
- Probe usage: `/api/odds/probe` and `/api/provider-health` call `runOddsProbe`
- Refresh usage: `/api/odds/refresh` invokes `refreshOddsSnapshotIfStale`
- Error classification: `runOddsProbe` maps HTTP and network/TLS/DNS/timeout into safe reason codes and redacts API key in snippets

### Sports data provider
- Key resolution: canonical+alias via `resolveWithAliases(CANONICAL_KEYS.SPORTSDATA_API_KEY, ALIAS_KEYS...)`
- Normalization outputs: `normalizeLog`, `normalizeSeason`, sport normalization (`NBA`→`nba`, `NFL`→`nfl`)
- Usage locations: provider registry (`registry.server.ts`), trusted context provider, and today service pipelines

### Registry unification
- Single central server resolution path is in place: `getProviderRegistry()`/`createProviderRegistry()` in `src/core/providers/registry.server.ts`
- Static scan did not find competing registry factories used by routes for odds/stats flows.

## D. Dead/Parallel Systems Detection

- **Parallel mode resolvers**:
  - `src/core/live/modeResolver.server.ts`
  - `src/core/mode/policy.ts`
  - UI-local intent mode logic in `useCockpitToday`
- **Parallel URL/query writers**:
  - `toHref` (canonical)
  - `appendQuery` (generic)
  - `buildRedirectWithQuery` (redirect-only passthrough)
- **Potentially legacy surfaces still shipped**:
  - `_archive` UI components under `src/components/_archive/*`
  - Dev-facing traces routes/components linked directly (`/traces`) from multiple pages
- **Possible orphan signals**:
  - `docs/audits/knip-report.json` lists unreferenced exports/files (needs re-validation against current HEAD before deletions)

## E. Observability & Telemetry

- Event schema: `ControlPlaneEventSchema` in `src/core/control-plane/events.ts`
- Emission path: `DbEventEmitter.emit` → `RuntimeStore.saveEvent`
- Non-blocking degradation confirmed:
  - `SupabaseRuntimeStore.saveEvent/listEvents` swallow analytics schema errors detected by `isMissingAnalyticsSchemaError`
  - `/api/events` GET degrades to `{ ok: true, events: [] }` on schema-cache failures (e.g. `PGRST204`)
- Minimal fix recommendation for analytics schema cache error:
  - add a startup/schema check endpoint or migration assert specifically for `events_analytics` required columns to reduce repeated runtime degradation warnings.

## F. Security & Secret Hygiene

- Provider diagnostics return safe key presence booleans/snippets (`/api/env/status`, `/api/provider-health`, `/api/odds/probe`)
- `runOddsProbe` sanitizes body snippets and redacts key-like query strings
- No obvious raw `apiKey=` logging found in provider probe path; warning logs are metadata-oriented
- Some direct `process.env` reads remain for untracked runtime metadata (`NODE_ENV`, `VERCEL_ENV`) and are acceptable; tracked secrets remain centrally resolved via env helpers.

## G. Leverage Plan (Top 10)

1. **Enforce node runtime on all diagnostics routes**  
   - Where: `/api/env/status`, `/api/odds/probe`, `/api/provider-health`  
   - Risk: Low  
   - Payoff: Prevent edge runtime regressions for outbound diagnostics.

2. **Single spine-aware fetch URL helper**  
   - Where: replace ad hoc `appendQuery('/api/...')` in cockpit/live/research clients  
   - Risk: Medium  
   - Payoff: trace/mode continuity and fewer query drift bugs.

3. **Consolidate mode resolution**  
   - Where: `live/modeResolver.server`, `mode/policy`, `useCockpitToday`  
   - Risk: Medium  
   - Payoff: deterministic mode behavior across server/client.

4. **Wrap direct `<Link href="/...">` with spine helper policy**  
   - Where: settings/dev/traces links  
   - Risk: Low  
   - Payoff: preserves context during navigation.

5. **Contract index test for core envelopes**  
   - Where: tests around `TodayPayloadSchema`, run DTO schema parse, event envelope  
   - Risk: Low  
   - Payoff: early drift detection on response-shape changes.

6. **Registry-only provider access lint/test**  
   - Where: forbid direct `createTheOddsApiProvider` usage in routes  
   - Risk: Low  
   - Payoff: one integration seam, easier incident response.

7. **Telemetry emitter wrapper for all route emits**  
   - Where: API routes using `new DbEventEmitter(...).emit`  
   - Risk: Low  
   - Payoff: consistent spine enrichment + reduced boilerplate.

8. **Supabase table constant sharing into docs/contracts**  
   - Where: `supabaseRuntimeStore.ts` + docs contract index  
   - Risk: Low  
   - Payoff: drift-resistant DB naming across runtime + migrations.

9. **Deprecation marker for `_archive` components**  
   - Where: `src/components/_archive/*`  
   - Risk: Low  
   - Payoff: cleaner search space and reduced accidental reuse.

10. **Query alias normalization policy doc + tests**  
   - Where: `spine.ts`, `contextSpine.ts`, major page search-param readers  
   - Risk: Low  
   - Payoff: stable back-compat without hidden alias drift.
