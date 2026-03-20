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
3. Slip page reads draft legs and early continuity identity (`slip_id`, `trace_id`) using `useDraftSlip`/`DraftSlipStore`.
4. `SlipIntelBar` computes correlation + fragility in real time.
5. User launches stress test; serialized draft text and continuity identity are sent into `/stress-test`.
6. `runSlip` reuses the pre-issued identity, then executes submit/extract/enrichment/verdict and persists the same run state.

### B) Postmortem review path

1. User enters Control Room review tab and pastes slip text or uploads a screenshot.
2. Screenshot uploads run client OCR; pasted text goes directly to `/api/slips/parseText`.
3. The parsed text is then sent through the canonical submit/extract-backed stress pipeline (`runSlip`) using the existing `trace_id`/`slip_id` when available.
4. Client posts the resulting extracted `dto.legs` plus continuity metadata to `/api/postmortem`.
5. API returns deterministic classification + slip-intelligence metrics grounded in the real parsed/extracted review input.
6. Control Room stores a structured review provenance object (`source_type`, `parse_status`, nullable `parse_confidence`, continuity ids, `had_manual_edits`, `generated_at`) and renders it in the review panel.
7. Screenshot OCR now pauses before postmortem with an extracted-text preview + manual correction loop; failed real ingestion stays visibly failed and never auto-swaps to demo.
8. A separate, explicitly labeled demo sample review remains available only through the sample action.
9. `/api/postmortem` now adds deterministic attribution (`weakest_leg`, compact `cause_tags`, `confidence_level`, `summary_explanation`) tied to `trace_id` and `slip_id`, so review reasoning can be compared across reruns without changing ingestion.
10. Attribution heuristics stay deterministic and explainable: they score the weakest leg from miss/pending pressure, threshold gap, report fragility, stat volatility, and correlation context; an optional LLM layer can sit on top later, but the canonical contract remains rule-based first.
11. After a real reviewed slip returns attribution, the client persists a compact local reviewed-attribution record keyed by canonical `trace_id`/`slip_id` and recomputes a bettor pattern summary through `src/core/postmortem/patternSource.ts` and `src/core/postmortem/patterns.ts`.
12. Pattern summaries are deterministic only: they aggregate repeated `cause_tags` plus weakest-leg prop type context, return `recurring_tags`, `common_failure_mode`, `sample_size`, `confidence_level`, `recommendation_summary`, and `recent_examples`, and explicitly return low-confidence / insufficient-history output instead of inventing a trend.
13. The BEFORE-stage slip builder now reuses that exact reviewed summary boundary via `src/core/slips/preSubmitPatternWarning.ts`: it computes an advisory-only `PreSubmitPatternWarning` contract (`warning_level`, `matched_patterns`, `recommendation_summary`, `suggested_fixes`, `sample_size`, `confidence_level`, optional `suppression_reason`) against the current draft slip and renders only when deterministic history plus current-slip signals support it.
14. Matching logic stays narrow and explainable: repeated `line_too_aggressive` tags require multiple current aggressive ladders, repeated `correlated_legs` tags require same-player/team/game-script stacking, and repeated `blowout_minutes_risk` tags require current legs that already carry supported blowout/mismatch signals. If history is absent or too thin, the module suppresses or downgrades confidence instead of inventing urgency.
15. Suggested fixes are generated only after a deterministic warning match. Each fix is a compact contract (`fix_type`, `title`, `explanation`, `affected_legs`, bettor-facing `suggested_action`, `confidence_level`) ranked by expected risk reduction, simplicity, and pattern alignment. The module proposes structural changes only — lower a threshold, break a same-script dependency, shift away from scoring ladders in blowout spots, or trim the weakest-confidence leg — and never auto-edits the slip or invents sportsbook-specific replacement lines.

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

- Query continuity now uses `src/core/nervous/spine.ts` and `src/core/nervous/routes.ts` for normalized keys (`sport,tz,date,mode,slip_id,trace_id,tab`).
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
- Calibration + defensibility loop (`src/core/metrics/calibrationEngine.ts`, `/api/metrics/calibration`) computes deterministic scorecard metrics (TAKE accuracy, weakest-leg accuracy, confidence bucket calibration, decision-profile tendencies) from trace-linked outcome logs.

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

## DURING: Slip tracking module

- Route split: `app/track/page.tsx` + `app/track/TrackPageClient.tsx` for the DURING command center.
- Core contracts: `src/core/slips/trackingTypes.ts` + `src/core/slips/slipStatusEngine.ts`.
- Deterministic update path: `src/core/slips/demoSlipTracker.ts` advances leg progress/outcomes using stable slip/leg hashes so demo mode remains believable without live providers.
- Persistence: `src/core/slips/storage.ts` stores tracked slips in localStorage and enables Draft/Tonight “Track this slip” continuity.
- Product rule: when a parlay is eliminated by one miss, ResearchBets **continues tracking remaining legs for learning** instead of stopping the timeline.

## AFTER: Journal module (v1)

- Journal contract: `src/core/journal/journalTypes.ts`.
- Entry builder: `src/core/journal/buildJournalEntry.ts` maps tracked slip state into compact review notes (hits, misses, runback candidates, bias-resistant notes).
- Persistence + UI: localStorage-backed `src/core/journal/storage.ts`, list view at `/journal`, detail view at `/journal/[entryId]`.
- Scope: local-first persistence for fast iteration; no backend dependency required for demo or degraded environments.

## AFTER: Review intelligence module (v2)

- Miss tagging engine: `src/core/review/missTagger.ts` maps losing legs into deterministic tags (`bust_by_one`, `assist_variance`, `ladder_distance`, `minutes_compression`, `coverage_gap`, `endgame_noise`) plus one-line narrative + lesson hints.
- Settlement pipeline: `src/core/review/settlement.ts` composes manual settlement inputs from `/track` into stable `PostmortemRecord` payloads and stores them through `src/core/review/store.ts`.
- DURING-to-AFTER bridge: `src/components/track/DuringCoach.tsx` writes draft coach snapshots, and settlement attaches the latest snapshot for “what coach saw vs what happened.”
- Edge aggregation: `src/core/review/edgeProfile.ts` derives local-only tendencies from postmortems (win rate, near-miss rate, high-fragility share, coverage-gap share, top miss tags, killer stat types).
- UI surfaces: `/track` includes a Settle panel; `/review` renders the Edge Profile card + recent postmortem table.
- Control Room AFTER-stage review (`app/(product)/control/*`, `src/core/control/reviewIngestion.ts`) now separates four truthful states: real review success, real review partial parse, real review failure, and explicit demo sample. Screenshot OCR can stop for manual correction before postmortem, while provenance stays attached to the resulting review output.
- Cross-slip bettor pattern layer (`src/core/postmortem/patterns.ts`, `src/core/postmortem/patternSource.ts`) extends the AFTER loop from one-slip attribution into repeated-mistake detection without changing the canonical review contract.
- History source rule: only real reviewed slips with deterministic attribution are stored in the local reviewed-attribution adapter; demo samples and failed parses are excluded so bettor history is never fabricated.
- Confidence rule: fewer than 3 reviewed slips, or fewer than 2 repeats for any `cause_tag`, yields `confidence_level: low` and `common_failure_mode: insufficient_history`.
- Failure mode rule: repeated aggressive lines, blowout/minutes flags, role mismatches, correlated legs, and high-variance stat types are bucketed into a small deterministic set of failure modes for compact review UI copy.
- Future extension path: a richer learning system can swap the storage adapter or add more features later, but it must continue to preserve canonical `trace_id` / `slip_id` continuity and deterministic summaries as the first layer.

## Landing architecture map

- Canonical home landing: `/`
- Alias: `/cockpit` renders the shared landing composition (no forked layout logic).
- Compatibility alias: `/landing` redirects to `/` and preserves query continuity.
- Landing board preview source of truth: `src/components/landing/BoardPreview.server.tsx` using `resolveTodayTruth` + `buildCanonicalBoard`.
- Copy policy on landing: neutral system status only; avoid `demo/beta/prototype/experimental` UI wording.
- Spine continuity for CTA links: `nervous.toHref`, `appendQuery`, and `withTraceId`.
- Flow: `/` -> `/today` -> `/slip|/ingest` -> `/stress-test?tab=analyze` -> `/track` -> `/traces/[trace_id]`.

## Bettor memory architecture

- Canonical bettor identity remains the existing `profiles` table. The bettor memory foundation extends that profile instead of introducing a separate parallel user system.
- Persistent upload artifacts live in Supabase storage bucket `bettor-artifacts` plus relational metadata in `bettor_artifacts`. This keeps original uploads separate from parsed or inferred data.
- Parsed slips and legs persist in `bettor_slips` and `bettor_slip_legs`. Sportsbook account screenshots persist in `bettor_account_activity_imports`. Stored settled reviews persist in `bettor_postmortems`.
- Server-only persistence and storage logic live in `src/core/bettor-memory/service.server.ts`. Deterministic analytics and classification live in `src/core/bettor-memory/analytics.ts`. Demo fallback snapshots live in `src/core/bettor-memory/demo.ts`.
- Current parser integration is explicit demo fallback: uploads are real and durable, but parsed fields may be marked `needs_review` with `parser_mode: demo` until a sportsbook-specific OCR/parser pipeline is integrated.
