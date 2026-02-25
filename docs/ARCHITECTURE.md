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

1. Board UI loads today payload from `getTodayPayload` (`app/page.tsx`, `/api/today`).
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
  - `LIVE_MODE` (default false until provider keys are set)
  - provider keys (`ODDS_API_KEY`, `SPORTSDATA_API_KEY`) as needed
- `scripts/env-check.mjs` enforces strict checks in CI/production/live mode and relaxed checks for local demo mode.

## Repo audits

Current audit sources to reference (do not duplicate fully):

- `AUDIT_REPORT.md` — broad system-state snapshot and risk inventory.
- `docs/audits/state-of-union-everyday-bettor-os.md` — product/architecture alignment review.
- `docs/audits/routes.manifest.md` + `docs/audits/routes.manifest.json` — route inventory output.
- `docs/repository-systems-audit.md` — deeper architecture and schema audit notes.

Key current truth from audits: audit manifests can lag route changes; treat route handlers in `app/` as source of truth when drift appears.
