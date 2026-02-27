# ResearchBets Architecture

## System diagram (text)

`Routes (/, /slip, /stress-test, /control)`
→ `API routes (/api/today, /api/slips/*, /api/postmortem, /api/events, /api/live/*, /api/researchSnapshot/*)`
→ `Core modules (today service, runSlip pipeline, slipIntelligence, live model/outcome, postmortem classifier)`
→ `Stores (DraftSlipStore/sessionStorage, runStore, RuntimeStore provider: memory or Supabase)`

## Lifecycle route map

- **Board (`/`)**: server loads `getTodayPayload`, client filters/leagues and queues draft legs.
- **Slip (`/slip`)**: draft building with `useDraftSlip` and `SlipIntelBar`.
- **Stress Test (`/stress-test`)**: Suspense boundary renders analysis workspace.
- **Control (`/control`)**: Suspense-wrapped control room for live monitoring and review/postmortems.
- **Aliases**:
  - `/discover` redirects to `/slip`
  - `/research` redirects to `/stress-test`
  - `/live` redirects to `/control?tab=live`

## Data flow diagrams

### A) Board → add props → DraftSlipStore → Stress Test

1. Board UI loads unified board payload through `src/core/board/boardService.server.ts` (`/api/today`, `/api/bettor-data`, stress scout consumers).
2. User taps add/analyze, writing legs via draft storage/store.
3. Slip page reads draft legs using `useDraftSlip`/`DraftSlipStore`.
4. `SlipIntelBar` computes correlation + fragility in real time.
5. User launches stress test; serialized draft text is sent to `/stress-test` prefill.
6. `runSlip` executes submit/extract/enrichment/verdict and persists run state.

### B) Postmortem review path

1. User enters Control Room review tab and uploads a slip image.
2. Client performs deterministic mock OCR parse to slip text.
3. Client replays stress-test pipeline (`runSlip`) for structured legs + verdict context.
4. Client posts `{ legs, outcome }` to `/api/postmortem`.
5. API returns deterministic classification + slip-intelligence metrics.
6. UI renders “what failed / what to change next” using returned signals.

## Provenance model

Across routes and envelopes, provenance is exposed as mode/source-style fields:

- **LIVE** — provider-backed payloads (`TodayPayload.mode = live`, envelope `source: live` patterns).
- **CACHE** — cached responses (`TodayPayload.mode = cache`, market snapshot cache status).
- **DEMO** — deterministic fallback payloads when live data is unavailable.
- **UNKNOWN** — error envelope fallback for unresolved source.

Product contract: UI must display degraded/demo context explicitly instead of implying live certainty.

## Persistence notes

### runStore

- `runStore` tracks the stress-test run lifecycle (`runSlip` output, verdict, source coverage).
- Used for fast UX continuity and replay of recent analysis.

### RuntimeStore abstraction

- `RuntimeStore` is the backend persistence interface (events, slips, snapshots, outcomes, etc.).
- Runtime provider is selected via `runtimeStoreProvider` (memory for tests/demo-safe paths, Supabase-backed store for persistent environments).

### Offline behavior

- Draft slip state uses session/local browser storage and keeps core lifecycle usable without external dependencies.
- In offline/demo mode, Supabase-dependent paths degrade instead of blocking the user journey.

## Deployment overview (Vercel)

- Runtime target: Next.js App Router deployment on Vercel.
- Recommended env baseline:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or publishable alias)
  - `SUPABASE_SERVICE_ROLE_KEY` (server only)
  - `LIVE_MODE` (optional override; production defaults to live when provider keys exist)
  - provider keys (`ODDS_API_KEY`, `SPORTSDATA_API_KEY`) as needed
- `scripts/env-check.mjs` enforces strict checks in CI/production/live mode and relaxed checks for local demo mode.


## Landing mode resolution

- `src/core/live/modeResolver.server.ts` is the shared server-safe resolver for landing mode decisions.
- It returns: `mode`, `reason`, `publicLabel`, and `dataFreshnessLabel`.
- Production behavior is live-first when `LIVE_MODE=true` and at least one provider key exists.
- If providers fail or keys are missing, APIs fall back to deterministic demo payloads with neutral copy (`Demo mode (live feeds off)`).

## Journey audit artifacts

- Static CTA graph: `scripts/audit-cta-graph.mjs` → `docs/CTA_GRAPH.json` + `docs/CTA_GRAPH.md`.
- Runtime golden path replay: `tests/journey.spec.ts` (Playwright JSON reporter writes `docs/JOURNEY_REPORT.json`).
- Markdown summary renderer: `scripts/render-journey-report.mjs` → `docs/JOURNEY_REPORT.md`.
- Unified command: `npm run audit:journey`.

## Repo audits

Always read `llm.txt` at repo root before implementing architecture-impacting changes; it is the short operational compass for North Star, invariants, and canonical contracts.

Current audit sources to reference (do not duplicate fully):

- `AUDIT_REPORT.md` — broad system-state snapshot and risk inventory.
- `docs/audits/state-of-union-everyday-bettor-os.md` — product/architecture alignment review.
- `docs/audits/routes.manifest.md` + `docs/audits/routes.manifest.json` — route inventory output.
- `docs/repository-systems-audit.md` — deeper architecture and schema audit notes.

Key current truth from audits: audit manifests can lag route changes; treat route handlers in `app/` as source of truth when drift appears.


### Canonical continuity spine
- Query continuity now uses `src/core/nervous/spine.ts` and `src/core/nervous/routes.ts` for normalized keys (`sport,tz,date,mode,gameId,propId,slipId,trace_id`).
- Navigation should use `nervous.toHref(...)` so context carries through board → slip → stress → control journeys.

## Bettor account-to-settle loop (MVP)

- Auth/profile: `/login`, `/profile`, and `/api/profile/upsert` support Supabase magic-link login and username persistence.
- Ingestion: `/ingest` accepts “My slip” and “Shared slip/text”, saves raw text first, then attempts deterministic parsing.
- Settlement: `/api/history-bets` now lists user slips and settles historical legs with deterministic demo-safe outcomes when live providers are unavailable.
- Feedback: shared slips trigger concise stored `feedback_items` with KEEP/MODIFY/PASS verdict guidance.
- History + board flow: `/history` provides settle actions and forwards users to `/today` for next-leg ideas.

### Mobile E2E loop + persistence tables (high level)

- Phone-first lifecycle path: `/login` → `/profile` → `/ingest` → `/history` → `/today` → `/stress-test`.
- Supabase-backed persistence (optional) centers on `profiles`, `slips`, `legs`, `settlements`, `leg_results`, and `feedback_items` with RLS policies for per-user access.
- Deterministic agent tier examples in this loop:
  - free-text slip parser (confidence + needs-review signal),
  - shared-slip feedback agent (KEEP/MODIFY/PASS + weakest-leg framing + safer alternative).

## Governor substrate (v1.0)

- `src/core/governor/runGovernor.server.ts` runs lightweight alignment checks for contract parity, trace continuity, demo truthfulness, client/server boundaries, and event integrity.
- `app/api/governor/report/route.ts` exposes a resilient `GovernorReport` for current trace context.
- `app/dev/governor/page.tsx` renders the report in a terminal-style checklist for development diagnostics.

- Prop scout agent (`src/core/agents/propScout.server.ts`) now ranks per-game recommendations deterministically by edge + L10, powering `/game/[gameId]` detail cards.
- Outcome learning loop (`/api/outcomes/log`, `src/core/learning/updateWeights.server.ts`) logs settled picks and emits `learning_update` events tied to `run_id`.

## Tonight decision surface intelligence (`/tonight`)

Positioning statement: **ResearchBets outputs leads, not payouts.**

- Route split: `app/tonight/page.tsx` (server wrapper) + `app/tonight/TonightPageClient.tsx` (client decision surface).
- Data contract reuse: `/tonight` and landing preview modules read the same `getTodayPayload` contract used by `/today`; provider fallback semantics are unchanged.
- Slate intelligence engine: `src/core/slate/slateEngine.ts`
  - Computes deterministic `SlateSummary` from `TodayPayload`.
  - Produces a bettor-facing narrative with pace/scoring/market-shape language.
  - Emits bias fields (`pace`, `scoring`, `assistTrend`), volatility flags, and prep confidence.
- Lead engine: `src/core/slate/leadEngine.ts`
  - Deterministically ranks board props into diversified high-probability leads.
  - Scores each lead with conviction (0–100), volatility class, script fit, and bettor-language reasoning + tags.
  - Applies deterministic diversification caps (`maxPerGame`) with a predictable relaxation pass (`maxPerGame=3`) to fill remaining slots.
  - Supports reactive windows by penalizing high-volatility legs and tightening first-pass per-game caps.
- Reactive window detection: `src/core/slate/reactiveWindow.ts`
  - Detects live/near-tip-off windows from payload game status/start-time hints.
  - When reactive, `/tonight` shows a volatility warning banner and the lead engine reduces fragile/high-volatility exposure.
- Landing tonight preview panel: `src/components/landing/TonightPreviewPanel.tsx`
  - Renders above the fold to show “Tonight’s Slate Read” + 3–5 ranked leads in under one fetch cycle.
  - Uses neutral mode labels (`Live`, `Cached`, `Demo mode (live feeds off)`) and preserves continuity-spine params on CTAs.

Determinism guarantee: all `/tonight` and landing lead computations are pure against `TodayPayload`, avoid randomization, and remain demo-safe when providers are unavailable.
