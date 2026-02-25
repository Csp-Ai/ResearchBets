# ResearchBets Audit — System State & Gaps

## 1) EXEC SUMMARY

- ResearchBets is a **Next.js 14 App Router application** that already has a working ingest→extract→analyze loop, plus a separate snapshot-style research orchestration pipeline and live-market terminal APIs.
- The strongest implemented spine today is: `POST /api/slips/submit` → `POST /api/slips/extract` → client-side enrichment/verdict in `runSlip` → render in `/research`.
- Runtime persistence is intentionally abstracted behind `RuntimeStore`, with `MemoryRuntimeStore` for tests and `SupabaseRuntimeStore` for dev/prod (except explicit memory override).
- Telemetry exists as a first-class concern: control-plane event schema validation, DB emitter, `events_analytics` persistence, and trace polling UI.
- Live terminal surfaces are implemented (`/live`, `/live/[gameId]`) and resilient via deterministic demo/cache fallbacks, but their “freshness” UX currently overstates live-ness because the market source is demo-first.
- Research snapshot orchestration (`buildResearchSnapshot`) is deeper than the mainstream `/research` UI currently exposes (insight nodes, connector selection, recommendation logging, snapshot persistence).
- Community/feed capabilities are present with Supabase-backed pagination, sorting, likes/feedback integration, and clone interactions.
- End-to-end “bettor-ready” confidence is limited by product flow mismatch: `/discover` (Scout) composes static draft legs but does not hand off into a canonical analyze run.
- **Top 5 gaps blocking bettor-ready UX:**
  1. Analyze flow is split between client-local run state and server snapshot pipelines (no single source of truth).
  2. Scout/Build flow lacks backend-backed run handoff to Analyze.
  3. Live pages are demo-heavy with optimistic copy and limited explicit source provenance in cards.
  4. Research snapshot artifacts (insight graph/recommendations) are under-surfaced in primary bettor UI.
  5. Environment assumptions are strict (`SUPABASE_*` required in dev), so operational setup/degradation pathways are uneven.

---

## 2) REPO MAP

### High-level map (major folders)

- `app/` — Next.js App Router pages + route handlers (primary web/API runtime).
- `src/` — Core domain/runtime logic (pipeline, persistence, telemetry, providers, components).
- `features/` — Product UI feature modules (betslip, dashboard, snapshot replay, landing).
- `services/` — service helpers/adapters (including Supabase client wrappers).
- `supabase/` and `db/` — database artifacts/config support.
- `tests/` — unit/integration tests for routes, runtime store contract, pipeline behaviors.
- `docs/` — architecture notes, audits, operational docs.
- `scripts/` — audit, env, Supabase, and utility scripts.

### Framework/routing

- **Next.js version:** `^14.2.35`.
- **Routing model:** **App Router** (top-level `app/` with `page.tsx` and `app/api/**/route.ts`).
- **Key entry points:**
  - Root layout: `app/layout.tsx` (wraps all pages in `AppShell`).
  - Landing route: `app/page.tsx`.
  - Main bettor routes: `/research`, `/ingest`, `/discover`, `/live`, `/community`.
  - API surface: `app/api/**/route.ts`.

---

## 3) BACKEND CAPABILITIES INVENTORY

| Capability | Where implemented | Inputs | Outputs | Dependencies |
|---|---|---|---|---|
| Slip ingestion | `app/api/slips/submit/route.ts` | JSON: `anon_session_id`, optional `user_id`, `source`, `raw_text`, `request_id`, optional `trace_id` | Stores `slip_submissions` record with checksum + emits `slip_submitted`; returns `{ slip_id, trace_id }` | `RuntimeStore.createSlipSubmission`, `DbEventEmitter`, rate-limit helper |
| Slip extraction | `app/api/slips/extract/route.ts`, `src/core/slips/extract.ts`, `src/core/slips/propInsights.ts` | JSON: `slip_id`, `request_id`, `anon_session_id` | Updates submission parse status + extracted legs; emits `slip_extracted`/`slip_extract_failed`; returns `{ extracted_legs, leg_insights, trace_id }` | `RuntimeStore.getSlipSubmission/updateSlipSubmission`, extraction parser, event emitter |
| Client-run analysis pipeline | `src/core/pipeline/runSlip.ts` | Raw slip text from UI | Creates/updates `Run` record (localStorage or Supabase `research_runs`) with extracted/enriched legs + verdict | Calls `/api/slips/*`, provider enrichers (`stats/injuries/odds`), trusted context, runStore |
| Research flow orchestration (snapshot) | `app/api/researchSnapshot/start/route.ts`, `src/flows/researchSnapshot/buildResearchSnapshot.ts` | JSON: `subject`, `sessionId`, optional user/tier/seed/marketType/requestId | Builds validated `ResearchReport`, insight nodes, recommendations, emits many control-plane events; persists snapshot | Connector registry, provider registry, live scouts, runtime store, event emitter |
| Agent system + registry | `src/agents/index.ts`, `src/core/agent-runtime/*`, `src/agents/researchSnapshot/ResearchSnapshotAgent.ts` | `agentId`, `input`, `AgentContext` | Structured `AgentRunResponse`, runtime trace events, schema-validated IO | Zod schemas, registry lookup, trace emitter |
| Telemetry/events + traces | `src/core/control-plane/events.ts`, `src/core/control-plane/emitter.ts`, `app/api/events/route.ts` | Event payloads (`ControlPlaneEvent`) or query (`trace_id`,`limit`) | Persists/lists control-plane events; trace feed for UI | `RuntimeStore.saveEvent/listEvents`, analytics schema guard |
| RuntimeStore abstraction | `src/core/persistence/runtimeStore.ts` | Typed method contracts across sessions/bets/events/snapshots/experiments/slips/etc. | Unified persistence API with many domain records | Implemented by memory + supabase stores |
| SupabaseRuntimeStore concrete implementation | `src/core/persistence/supabaseRuntimeStore.ts` | All RuntimeStore entities | Persists to tables: `runtime_sessions`, `research_reports`, `events_analytics`, `slip_submissions`, `bets`, etc. | Supabase service client from env (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) |
| Demo/live mode + fallback behaviors | `src/core/bettor/gateway.server.ts`, `src/core/markets/marketData.ts`, `src/core/providers/registry.server.ts`, `src/components/live/*` | `LIVE_MODE`, provider key availability, request headers/query | Returns live or fallback/demo envelopes with degradation context | `ODDS_API_KEY`, `SPORTSDATA_API_KEY`, fallback demo fixtures |
| Scheduled/alerting primitives | `app/api/cron/settle-bets/route.ts`, `app/api/settlement/run/route.ts`, `app/api/results/ingest/route.ts` | Cron secret header or manual trigger requests | Settles pending bets / ingests results / generates settlement side effects | `CRON_SECRET`, runtime store, settlement modules |

### Notable runtime store behavior

- Provider selects memory in `NODE_ENV=test`; production enforces supabase; dev defaults to supabase unless `DEV_PERSISTENCE_BACKEND=memory`.
- Events table errors due to missing analytics schema are handled as graceful degradation in list/insert paths (returns empty events vs hard fail in list context).

---

## 4) FRONTEND SURFACES INVENTORY

| Page/Route | Purpose | Data dependencies | Key components |
|---|---|---|---|
| `/` (Landing) | Entry CTA for Analyze/Scout/Continue flows | none (static props) | `LandingPageClient` |
| `/research` (Analyze/Scout/Live tabs) | Main bettor workspace with verdict, leg ranking, optional scout/live summaries | `runStore` (`listRuns/getRun/updateRun`), `runSlip`, `GET /api/bettor-data`, query params `tab`, `trace`, `prefill` | `ResearchPageContent`, `VerdictHero`, `LegRankList`, `ShareReply`, `RecentActivityPanel` |
| `/discover` (Scout/Build Slip) | Build draft legs from static game/prop data | in-file constants only (no API calls) | `GamesToday`, `PlayerPropHeatmap`, `SlipBuilder` |
| `/live` | Live market terminal board + quick model actions | `GET /api/live/market`, `POST /api/live/model`, poller, action contract telemetry | `LiveGamesClient` |
| `/live/[gameId]` | Game detail terminal with model/outcome/track interactions | `GET /api/live/game/[gameId]`, `POST /api/live/model`, `GET /api/live/outcome/[gameId]`, `POST /api/live/props/track` | `LiveGameDetailClient` |
| `/community` | Social feed and clone-to-analyze experience | `GET /api/feed` (+ cursor pagination), post interaction APIs from card | `FeedCard` |
| `/ingest` | Slip paste/upload OCR and launch analysis run | `runSlip`, OCR client (`tesseract.js`) | `IngestPageClient` |
| `/research/snapshot/[snapshotId]` | Snapshot replay / evidence + leg insights visualization | runtime store snapshot fetch via server, optional replay query | `SnapshotReplayView` |
| `/traces` (dev only) | Trace index/debug entry | `GET /api/events?limit=200`, local storage | `TracesIndexContent` |
| `/traces/[trace_id]` (dev only) | Trace detail replay/debug | trace-specific event fetch hooks/components | `TraceDetailPageClient` |

### Required-surface notes

- **Landing / Analyze / Scout / Live / Community:** all exist, but Scout’s production path is mostly local/static and not integrated with canonical analysis persistence.
- **Ingest flow:** separate and complete (`/ingest`) with OCR + paste.
- **Research results view:** exists in `/research` (verdict + ranked legs) and `/research/snapshot/[snapshotId]` (replay details).
- **Debug/trace views:** `/traces` and `/traces/[trace_id]` gated to development.

---

## 5) END-TO-END DATA FLOW DIAGRAM (TEXT)

### A) Anonymous slip → extract → analyze → verdict

1. User enters slip on `/ingest` or `/research` paste modal.
2. UI calls `runSlip(rawText)` (`src/core/pipeline/runSlip.ts`).
3. `runSlip` creates local run skeleton in `runStore` (`status=running`, local trace ID).
4. `runSlip` calls `POST /api/slips/submit` with anon session + raw text.
5. API stores `slip_submissions` row and emits `slip_submitted` event.
6. `runSlip` calls `POST /api/slips/extract` with `slip_id`.
7. API parses legs (`extractLegs`), writes parsed legs back to submission, emits `slip_extracted`.
8. Client enriches each leg (`enrichStats`, `enrichInjuries`, `enrichOdds`) and pulls trusted context (`getRunContext`).
9. Client computes verdict (`computeVerdict`) and updates run to `complete` in `runStore`.
10. `/research?trace=...` loads run and renders verdict hero + ranked leg table.

### B) Scout/build slip → analyze

1. User opens `/discover` and adds legs into local `SlipBuilder` state.
2. Data source is static constants (`TODAY_GAMES`, `HEATMAP_PLAYERS`) — no API fetch.
3. User can navigate manually to analyze flow, but there is no direct serialization of drafted legs into a server-backed slip submission API contract.
4. Current practical path is still to `/ingest` or `/research` paste/prefill text, then run flow A.

### C) Live terminal → expected data and degradation

1. `/live` client poller calls `GET /api/live/market?sport=...&trace_id=...` repeatedly.
2. API resolves market snapshot from `getMarketSnapshot`; currently web provider is disabled by default and returns demo snapshot.
3. API logs market-related events and returns envelope with source/degraded flags.
4. UI renders market board; if errors or empty rows occur, it explicitly shows demo/degraded messaging.
5. Optional quick model action uses `POST /api/live/model` to compute/cache model deltas per game.
6. `/live/[gameId]` expects game detail + outcome/model endpoints; when unavailable, UI falls back to demo-safe messaging and keeps workflow operable.

---

## 6) BACKEND↔FRONTEND GAP ANALYSIS

### A) Backend features not surfaced in UI

1. **Research snapshot insight graph/recommendation depth mostly hidden from bettor Analyze page**  
   - Files: `src/flows/researchSnapshot/buildResearchSnapshot.ts`, `app/api/researchSnapshot/start/route.ts`, `src/components/research/ResearchPageContent.tsx`  
   - Severity: **P1**  
   - Fix: Add explicit “snapshot mode” in `/research` that fetches and renders snapshot claims/evidence/recommendations, not just client-enriched legs.

2. **RuntimeStore’s rich entities (experiments, edge realized, tracked props) underexposed in core bettor dashboards**  
   - Files: `src/core/persistence/runtimeStore.ts`, `app/api/edge/*`, `app/api/experiments/assign/route.ts`  
   - Severity: **P2**  
   - Fix: Add summary widgets/inspector tabs to consume these APIs in bettor-facing pages.

3. **Agent runtime/registry generic pipeline not used for main slip-analyze UX**  
   - Files: `src/core/agent-runtime/runFromRegistry.ts`, `src/agents/index.ts`, `src/core/pipeline/runSlip.ts`  
   - Severity: **P2**  
   - Fix: Route at least one production user path through registry execution to avoid dual orchestration paradigms.

### B) UI surfaces stubbed/demo-only due to backend gaps

1. **Scout (`/discover`) is static fixture-driven**  
   - Files: `app/discover/page.tsx`  
   - Severity: **P0**  
   - Fix: Replace constants with `GET /api/games/search` + game-detail APIs and emit transferable slip payload to analyze.

2. **Live market source is effectively demo-first**  
   - Files: `src/core/markets/marketData.ts`, `src/components/live/LiveGamesClient.tsx`  
   - Severity: **P1**  
   - Fix: Implement real web/provider loader in `loadWebSnapshot` (or provider adapters), then expose explicit source badges per row.

3. **Trusted context injuries path can return empty/no_data even when key present**  
   - Files: `src/core/context/trustedContextProvider.server.ts`  
   - Severity: **P1**  
   - Fix: Wire real injuries fetcher; today odds path is more connected than injuries path.

### C) Glue gaps (adapters/wiring/env assumptions)

1. **Analyze run state split between client `runStore` and server `research_reports` snapshots**  
   - Files: `src/core/run/store.ts`, `src/core/pipeline/runSlip.ts`, `app/api/researchSnapshot/*`  
   - Severity: **P0**  
   - Fix: Define canonical run contract + one persistence backend; adapt both APIs and UI to same run ID/trace model.

2. **Trace continuity mismatch between client-generated trace IDs and API-generated trace IDs**  
   - Files: `src/core/pipeline/runSlip.ts`, `app/api/slips/submit/route.ts`  
   - Severity: **P1**  
   - Fix: propagate returned `trace_id` from submit into run state and subsequent UI links/events.

3. **Dev env hard requirement on Supabase service vars can prevent fallback-only local usage**  
   - Files: `src/core/env/server.ts`  
   - Severity: **P1**  
   - Fix: relax dev requirement for specific routes or support explicit offline mode to avoid throwing during startup.

---

## 7) UX READINESS SCORECARD (bettor-first)

Scale: 0 (poor) → 5 (excellent)

- **Time-to-first-value: 4/5**  
  Strong ingest and paste UX; verdict appears quickly with deterministic fallback.
- **Clarity of verdict: 4/5**  
  Verdict hero + confidence + weakest leg explanations are understandable.
- **Leg-level actionability: 3/5**  
  Ranked legs and risk factors exist, but Scout→Analyze and tracking loops are not unified.
- **Live context reliability: 2/5**  
  Terminal UX is stable, but data is predominantly demo/cache with limited true-live evidence.
- **Demo-mode reliability: 5/5**  
  Strong fallback patterns, explicit degraded copy, and resilient no-crash behavior.
- **Observability/diagnostics (builders): 4/5**  
  Event schemas, trace APIs, and dev-only trace pages provide useful diagnostics.

### Fastest path to premium feel (UI-only)

1. Unify `/discover` and `/research` through one “Send draft to Analyze” CTA + payload bridge.
2. Add visible source badges per leg/game (“live/cache/demo”) and confidence-cap rationale inline.
3. Surface top 1–2 snapshot claims/evidence cards in Analyze tab for richer perceived intelligence.

### Must-have backend work

1. Implement non-demo live market/injury providers in current adapters.
2. Consolidate run/snapshot persistence into one canonical report/read model.
3. Align trace IDs end-to-end across ingest APIs, run store, and telemetry retrieval.

---

## 8) NEXT BUILD PLAN (7–14 days)

### Sequence (high impact, low risk first)

1. **Create Analyze contract unification doc + type**  
   - Targets: `src/core/run/types.ts`, `src/core/evidence/evidenceSchema.ts`  
   - Acceptance: one mapped DTO supports both runSlip and researchSnapshot read paths.

2. **Add Scout → Analyze handoff API payload**  
   - Targets: `app/discover/page.tsx`, `features/betslip/SlipBuilder.tsx`, `app/ingest/page.tsx`  
   - Acceptance: user can build in Scout and land in Analyze with identical legs without manual copy.

3. **Propagate authoritative API trace ID into client run**  
   - Targets: `src/core/pipeline/runSlip.ts`, `/api/slips/submit` response handling  
   - Acceptance: trace links in research/traces match backend event traces for same run.

4. **Expose snapshot highlights in Analyze UI**  
   - Targets: `src/components/research/ResearchPageContent.tsx`, `app/api/researchSnapshot/[id]/route.ts`  
   - Acceptance: Analyze page shows snapshot claim summary when available.

5. **Implement live market provider path (non-demo)**  
   - Targets: `src/core/markets/marketData.ts`, provider registry adapters  
   - Acceptance: at least one sport returns source != `DEMO` in normal configured env.

6. **Add source/freshness chips across live and analyze cards**  
   - Targets: `src/components/live/LiveGamesClient.tsx`, `src/components/bettor/*`  
   - Acceptance: each major card displays explicit provenance state.

7. **Wire trusted injuries fetch in server trusted context provider**  
   - Targets: `src/core/context/trustedContextProvider.server.ts`, providers  
   - Acceptance: with keys configured, coverage reports injuries as live for supported cases.

8. **Add bettor-facing edge/settlement mini dashboard**  
   - Targets: `app/dashboard/page.tsx`, `app/api/edge/report/route.ts`, `app/api/dashboard/summary/route.ts`  
   - Acceptance: user sees tracked outcome/edge trend from existing backend metrics.

### Parallelization

- Parallel Track A: tasks 2, 4, 6 (frontend integration).
- Parallel Track B: tasks 5, 7 (provider/backend live data).
- Parallel Track C: tasks 1, 3 (contracts + trace consistency).
- Task 8 can start once Track A or B is delivering stable data.

---

## 9) APPENDIX

### A) API routes discovered (method + path + file)

- POST `/api/anon/init` — `app/api/anon/init/route.ts`
- GET `/api/history-bets` — `app/api/history-bets/route.ts`
- POST `/api/history-bets` — `app/api/history-bets/route.ts`
- POST `/api/settlement/run` — `app/api/settlement/run/route.ts`
- GET `/api/games/[id]` — `app/api/games/[id]/route.ts`
- GET `/api/games/search` — `app/api/games/search/route.ts`
- GET `/api/edge/scorecard` — `app/api/edge/scorecard/route.ts`
- GET `/api/edge/report` — `app/api/edge/report/route.ts`
- GET `/api/experiments/assign` — `app/api/experiments/assign/route.ts`
- POST `/api/events` — `app/api/events/route.ts`
- GET `/api/events` — `app/api/events/route.ts`
- POST `/api/results/ingest` — `app/api/results/ingest/route.ts`
- GET `/api/dev/mirror/status` — `app/api/dev/mirror/status/route.ts`
- POST `/api/dev/mirror/chat` — `app/api/dev/mirror/chat/route.ts`
- POST `/api/slips/submit` — `app/api/slips/submit/route.ts`
- POST `/api/slips/extract` — `app/api/slips/extract/route.ts`
- GET `/api/live/outcome/[gameId]` — `app/api/live/outcome/[gameId]/route.ts`
- GET `/api/researchSnapshot/[id]` — `app/api/researchSnapshot/[id]/route.ts`
- POST `/api/researchSnapshot/start` — `app/api/researchSnapshot/start/route.ts`
- POST `/api/live/props/track` — `app/api/live/props/track/route.ts`
- GET `/api/u/[username]` — `app/api/u/[username]/route.ts`
- GET `/api/live/game/[gameId]` — `app/api/live/game/[gameId]/route.ts`
- GET `/api/live/market` — `app/api/live/market/route.ts`
- POST `/api/live/model` — `app/api/live/model/route.ts`
- GET `/api/bets` — `app/api/bets/route.ts`
- POST `/api/bets` — `app/api/bets/route.ts`
- POST `/api/bets/[id]/settle` — `app/api/bets/[id]/settle/route.ts`
- GET `/api/health` — `app/api/health/route.ts`
- GET `/api/dashboard/summary` — `app/api/dashboard/summary/route.ts`
- GET `/api/metrics/calibration` — `app/api/metrics/calibration/route.ts`
- GET `/api/community` — `app/api/community/route.ts`
- POST `/api/community` — `app/api/community/route.ts`
- GET `/api/bettor-data` — `app/api/bettor-data/route.ts`
- POST `/api/odds/refresh` — `app/api/odds/refresh/route.ts`
- GET `/api/feed` — `app/api/feed/route.ts`
- POST `/api/cron/settle-bets` — `app/api/cron/settle-bets/route.ts`
- POST `/api/feed/[post_id]/feedback` — `app/api/feed/[post_id]/feedback/route.ts`

### B) Env vars referenced + where

Primary env keys seen in active runtime paths:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — `src/core/env/server.ts`, Supabase clients.
- `LIVE_MODE` — `src/core/env/server.ts`, `src/core/bettor/gateway.server.ts`.
- `SPORTSDATA_API_KEY`, `ODDS_API_KEY` — provider registry and gateway/trusted context paths.
- `TRUSTED_SPORTSDATAIO_KEY`, `TRUSTED_ODDS_API_KEY` — trusted context fallback checks.
- `CRON_SECRET`, `VERCEL` — cron route auth/execution guard.
- `SPORTSDATAIO_BASE_URL`, `ODDS_API_BASE_URL` — provider adapters.
- `ENABLE_COVERAGE_AGENT`, `NEXT_PUBLIC_ENABLE_COVERAGE_AGENT` — context and client preferences.
- `LIVE_MARKETS_WEB_PROVIDER_ENABLED` — market snapshot web provider toggle.
- WAL configs (`WAL_*`) and metric validation (`METRIC_EVENT_VALIDATION`) — web/measurement subsystems.

### C) Key domain types/interfaces + where

- `RuntimeStore` + record interfaces (`StoredBet`, `SlipSubmission`, etc.) — `src/core/persistence/runtimeStore.ts`.
- `ResearchReport` and evidence contracts — `src/core/evidence/evidenceSchema`.
- `ControlPlaneEvent` schema and event names — `src/core/control-plane/events.ts`.
- Run model (`Run`, `EnrichedLeg`, `VerdictAnalysis`) — `src/core/run/types`.
- Terminal contracts (`MarketSnapshotSchema`, etc.) — `src/core/contracts/terminalSchemas`.

### D) Commands run + summarized outputs

1. `ls` — confirmed monorepo-like Next app with `app/`, `src/`, `features/`, `services/`, `supabase/`, `tests/`.
2. `find . -maxdepth 3 -type f -name "package.json" -o -name "next.config.*" -o -name "vercel.json" -o -name ".env*" -o -name "supabase*"` — located root package/env/config files (output noisy due node_modules).
3. `cat package.json` — confirmed Next 14.2.35, App scripts (`build`, `typecheck`, lint/test, audit scripts).
4. `rg -n "app/|pages/|route.ts|API route|/api/" -S .` — discovered route/page references and API usage patterns.
5. `rg -n "RuntimeStore|SupabaseRuntimeStore|MemoryRuntimeStore" -S .` — located persistence abstraction and implementations.
6. `rg -n "slip_submissions|slip_submitted|slip_extracted|trace_id|events" -S .` — verified telemetry and ingestion event pathways.
7. `rg -n "LIVE_MODE|demo|fallback|trusted" -S .` — identified fallback/degradation behavior across backend and UI.
8. `rg -n "Analyze|Scout|Live|Community|Ingest|Research" -S src app pages components` — command produced expected findings but with missing-dir warnings for `pages`/`components` roots; re-ran successfully on `src app`.
9. `npm run typecheck` — passed.
10. `npm run build` — passed; app routes compiled successfully.

---

## Console summary

**AUDIT_REPORT.md written**

Headline findings:
1. Ingest→extract→analyze path is operational and resilient.
2. Snapshot orchestration is deeper than what primary Analyze UI currently surfaces.
3. Scout flow is static and not glued to canonical analysis persistence.
4. Live terminal UX is robust but currently demo/cache-heavy in data provenance.
5. RuntimeStore + telemetry foundations are strong and ready for tighter product integration.
