# ResearchBets

**Anonymous-first sports betting research app with a bettor loop: Board → Ingest → Stress Test → Settle/History. Deterministic agents parse slips and shared texts, explain weakest legs, track outcomes, and surface next-slate ideas with demo/live fallbacks and optional Supabase persistence.**

## Start here: Universal Landing (`/`)

ResearchBets uses `/` as the canonical home landing entrypoint.

- `/` is the canonical landing route and renders the shared landing composition.
- `/cockpit` is a thin route alias that renders the same landing composition.
- `/landing` is a compatibility alias that redirects to `/` while preserving query continuity.

Canonical local URL examples:

- `http://localhost:3000/?sport=NBA&tz=America/Phoenix&date=YYYY-MM-DD&mode=live`
- `http://localhost:3000/cockpit?sport=NFL&tz=America/New_York&date=YYYY-MM-DD&mode=demo`

## Lifecycle OS (canonical flow)

1. **Landing** (`/`) — canonical front door with board preview, slip rail, and intelligence handoff.
2. **Slip** (`/slip`) — build a draft slip and see live fragility/correlation intelligence.
3. **Stress Test** (`/stress-test`) — run deterministic extraction + risk analysis before placing.
4. **Control** (`/control`) — monitor live risk and run review mode for settled slips.
5. **Review / Improve** (`/control?tab=review`) — classify what failed and what to change next.

Legacy aliases are preserved for continuity:

- `/discover` → `/slip`
- `/research` → `/stress-test`
- `/live` → `/control?tab=live`

## New user journey in 60 seconds (guest)

1. Open `/` (or `/cockpit`, which is the shared alias route).
2. Add legs from the board and jump to `/slip`.
3. Build your slip and check `SlipIntelBar` for correlation + volatility warnings.
4. Hit **Stress Test** to run analysis on `/stress-test`.
5. Open `/control` to monitor live risk deltas.
6. After result, use review mode with an uploaded slip image to generate a postmortem.

No account is required for this loop; draft and recent postmortem state are stored locally first.

## Modes

ResearchBets is deterministic-first and degrades safely.

- **demo** (default): deterministic payloads and safe fallbacks.
- **cache**: cached/provider-backed payload when available, with neutral degradation messaging.
- **live**: provider-backed attempts when keys exist; safe fallback to cache/demo on failure.

`/api/today` returns `mode: live | cache | demo` with optional reason text.

## Local development

### 1) Install + start (offline/demo)

```bash
npm ci
cp .env.local.example .env.local
npm run dev
```

This works in demo mode with graceful degradation for Supabase-backed features.

### 2) Full mode (Supabase + providers)

Required for live mode:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<server-only>
ODDS_API_KEY=<key>
SPORTSDATA_API_KEY=<key>
LIVE_MODE=true
CRON_SECRET=<server-only>
```

Optional:

```bash
ODDS_API_BASE_URL=<override-api-base-url>
PUBLIC_APP_NAME=<ui-label>
```

Legacy aliases still supported (canonical names above are preferred):

```bash
THEODDSAPI_KEY=<legacy alias for ODDS_API_KEY>
SPORTSDATAIO_API_KEY=<legacy alias for SPORTSDATA_API_KEY>
```

### 3) Environment validation (`env:check` strict vs relaxed)

- **Strict mode:** CI, production, or `LIVE_MODE=true`.
  - Missing required Supabase public keys fails hard.
- **Relaxed mode:** local demo mode.
  - Missing keys warn and continue with degraded/offline behavior.

Run checks directly:

```bash
npm run env:check
npm run env:check:strict
```

Common fix for failures: copy `.env.local.example`, set canonical keys above, then restart dev server (or redeploy on Vercel after changing env vars).



## AFTER loop additions

- `/track` now includes manual-first **Settle** actions that write deterministic postmortems to local storage (`rb:postmortems:v1`).
- `/review` shows a local-only **Edge Profile** plus recent postmortems.
- DURING Coach snapshots are saved (`rb:draft-postmortems:v1`) and attached to settlement records for AFTER comparison.

## Repo Grounding

- Canonical entry routing chain is `app/page.tsx` (canonical landing render), `app/cockpit/page.tsx` (shared alias render), and `app/landing/page.tsx` (compatibility redirect to `/`).
- Keep one spine for internal navigation: `nervous.toHref()` + `appendQuery()` on route transitions.

### Key routes (BEFORE / DURING / AFTER)

- **BEFORE placement**: `/`, `/today`, `/login`, `/profile`, `/ingest`.
- **DURING decisioning**: `/slip`, `/stress-test`, `/research` (alias redirect).
- **AFTER placement**: `/history`, `/control`, `/control?tab=review`, `/live` (alias redirect).

### Demo vs live contract

- Demo mode remains deterministic-first and should continue to return useful payloads without external provider keys.
- Live mode attempts provider-backed data and safely degrades to cached/demo payloads with explicit `mode` and optional reason labels.

### Guardrails

```bash
npm run verify:landing
npm run check
```

`npm run check` is the canonical pre-PR gate (lint + typecheck + test + build).

### Release checklist

Use `docs/RELEASE.md` for the current step-by-step release runbook (v0.2.0+).

### Sprint 6 focus

- Performance: lazy-load heavy OCR and non-critical panels so ingest/stress-test/control show value faster.
- Prune: reduce duplicate/legacy variants and keep canonical entry points authoritative.
- Spine: preserve query/context continuity through `nervous.toHref()` + `appendQuery()`.

## Landing page wiring

- Canonical entry route is `/`; `/cockpit` reuses the same landing composition and `/landing` redirects to `/`.
- `public/landing.html` is optional legacy/reference content and is **not** the canonical product front door.
- Run `npm run verify:landing` to enforce no drift back to legacy root redirects.
- No placeholder routes were added: `/ingest`, `/cockpit`, `/slip`, and `/control` already exist in the app router.

## Key routes

| Route | Purpose |
| --- | --- |
| `/` | Canonical front door: shared landing composition with board preview + cockpit surface. |
| `/cockpit` | Alias route that renders the same landing composition as `/`. |
| `/today` | Board: today slate aggregation, filtering, add-to-draft, quick analyze handoff. |
| `/slip` | Draft slip builder with `useDraftSlip`, `DraftSlipStore`, and `SlipIntelBar`. |
| `/stress-test` | Suspense-wrapped stress-test workspace using `ResearchPageContent`. |
| `/control` | Control Room with live monitoring and review/postmortem tabs. |
| `/discover` | Alias redirect to `/slip`. |
| `/research` | Alias redirect to `/stress-test`. |
| `/live` | Alias redirect to `/control?tab=live`. |

## Key APIs

| Endpoint | Purpose |
| --- | --- |
| `GET /api/today` | Board payload aggregator with live→demo fallback and cache mode. |
| `GET /api/provider-health` | Fast provider configuration + reachability check for live mode diagnostics. |
| `POST /api/slips/submit` | Store raw slip text + emit `slip_submitted` telemetry event. |
| `POST /api/slips/extract` | Parse slip legs + leg insights and emit extraction events. |
| `POST /api/postmortem` | Deterministic postmortem classification + slip intelligence summaries. |
| `GET/POST /api/events` | Control-plane event ingestion and trace/event retrieval. |
| `GET /api/live/market` | Market snapshot list (demo-safe, envelope-based response). |
| `GET /api/live/game/:gameId` | Single game payload with model/props/heuristics. |
| `POST /api/live/model` | Quick model run for selected game. |
| `GET /api/live/outcome/:gameId` | Deterministic outcome simulation + edge realization + emitted events. |
| `POST /api/live/props/track` | Persist tracked prop and emit tracking events. |
| `POST /api/researchSnapshot/start` | Start snapshot run and persist report metadata. |
| `GET /api/researchSnapshot/:id` | Retrieve snapshot + normalized recommendation payload. |

## Slip intelligence: where it lives and what it outputs

- Engine: `src/core/slips/slipIntelligence.ts` (`computeSlipIntelligence`).
- UI bar: `src/components/slips/SlipIntelBar.tsx`.
- State: `src/core/slips/draftSlipStore.ts` + `src/hooks/useDraftSlip.ts`.

Outputs include:

- `correlationScore`
- `fragilityScore`
- `volatilityTier`
- `exposureSummary` (top games + players)
- `weakestLegHints` (actionable fragility explanations)

## Postmortem flow

1. User uploads a slip image in `/control` review tab.
2. Client runs deterministic mock OCR parse (`mockParseSlip`) from file name to slip text.
3. Parsed text is replayed through stress-test pipeline (`runSlip`) to recover legs/verdict context.
4. Client calls `POST /api/postmortem` with legs + outcome.
5. API returns deterministic classification and intelligence-driven notes:
   - **what failed** (correlation/injury/line-value misses)
   - **what to change next** (derived in UI from returned exposure + volatility signals)



## CTA and journey continuity audit

Run the lightweight UX audit harness:

```bash
npm run audit:journey
```

This command runs:

1. `node scripts/audit-cta-graph.mjs` → outputs `docs/CTA_GRAPH.json` + `docs/CTA_GRAPH.md`.
2. `playwright test tests/journey.spec.ts` → writes `docs/JOURNEY_REPORT.json`.
3. `node scripts/render-journey-report.mjs` → renders `docs/JOURNEY_REPORT.md`.

## Repo audits

Audit artifacts live in `docs/audits/` and root reports. Start with:

- `AUDIT_REPORT.md`
- `docs/audits/state-of-union-everyday-bettor-os.md`
- `docs/audits/routes.manifest.md`
- `docs/repository-systems-audit.md`

Use these as snapshots of architecture risk and drift; prefer summaries in docs over duplicating report content.

Current execution plan for the shareable-terminal gate and v1 path:

- `docs/roadmaps/v0.6.1-shareable-terminal-plan.md`

## Docs index

- `docs/ARCHITECTURE.md` — system/data flow and deployment model.
- `docs/PRODUCT.md` — product positioning, user journey, and promises.
- `docs/CHANGELOG_HACKATHON.md` — recent sprint-level lifecycle changes.
- `docs/SETUP.md` — extended setup/deployment details.

## Dependency notes

- `autoprefixer` and `postcss` remain because `postcss.config.js` and Tailwind CSS processing depend on them.
- `knip` remains because `audit:unused` scripts execute `npx knip` for prune visibility.

## Releases vs Packages

- **Releases** are versioned app snapshots (for example, `v0.6.0` pre-release) that bundle product, docs, and migration state.
- **Packages** are only needed if ResearchBets publishes a reusable SDK, CLI, or Docker image.
- **Current deployment path**: GitHub repository → Vercel app deployment → Supabase migrations/runtime store.

## Quality checks

```bash
npm run docs:check
npm run lint
npm run typecheck
npm run build
```

Targeted deterministic tests worth running during lifecycle changes:

```bash
npx vitest run app/api/today/__tests__/route.test.ts app/api/postmortem/__tests__/route.test.ts src/core/slips/__tests__/slipIntelligence.test.ts
```


## Canonical environment + provider troubleshooting

Canonical names (Vercel/project settings should match exactly):

- Public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Optional public: `PUBLIC_APP_NAME`
- Server-only: `SUPABASE_SERVICE_ROLE_KEY`, `ODDS_API_KEY`, `ODDS_API_BASE_URL`, `SPORTSDATA_API_KEY`, `LIVE_MODE`, `CRON_SECRET`
- Legacy aliases: `THEODDSAPI_KEY` -> `ODDS_API_KEY`, `SPORTSDATAIO_API_KEY` -> `SPORTSDATA_API_KEY`

Debug flow:

1. Call `GET /api/env/status` first; expect `resolvedMode.reason=live_ok` before provider checks.
2. Call `GET /api/provider-health`; inspect `checks.odds.reason` (`http_401`, `http_403`, `http_429`, `timeout`, `dns`, `bad_base_url`, `unknown`) and optional `statusCode`.
3. After any Vercel env update, redeploy to apply new runtime values.

## Bettor account-to-settle loop (MVP)

- Auth/profile: `/login`, `/profile`, and `/api/profile/upsert` support Supabase magic-link login and username persistence.
- Ingestion: `/ingest` accepts “My slip” and “Shared slip/text”, saves raw text first, then attempts deterministic parsing.
- Settlement: `/api/history-bets` now lists user slips and settles historical legs with deterministic demo-safe outcomes when live providers are unavailable.
- Feedback: shared slips trigger concise stored `feedback_items` with KEEP/MODIFY/PASS verdict guidance.
- History + board flow: `/history` provides settle actions and forwards users to `/today` for next-leg ideas.

## How to try on phone

1. Open `/login` and continue with the magic-link scaffold.
2. Set username in `/profile`.
3. Upload/paste a ticket in `/ingest` (`My slip` or `Shared slip/text`).
4. Open `/history` and run settle on a recent upload.
5. Continue to `/today` for next-slate ideas.
6. Use `/stress-test` for deterministic weakest-leg analysis before placing.

## v1.0 substrate hardening additions

- Canonical runtime environment flags now live in `src/core/env/runtime.server.ts` with client-safe derivations in `src/core/env/runtime.shared.ts`.
- Canonical Zod envelopes for trace/today/slips/events/governor live in `src/core/contracts/envelopes.ts`.
- Trace continuity is enforced through `src/core/trace/getTraceContext.server.ts`; target APIs now always include `trace_id`.
- Governor agent endpoint: `/api/governor/report`.
- Dev-only governor surface: `/dev/governor`.

- Prop scout agent (`src/core/agents/propScout.server.ts`) now ranks per-game recommendations deterministically by edge + L10, powering `/game/[gameId]` detail cards.
- Outcome learning loop (`/api/outcomes/log`, `src/core/learning/updateWeights.server.ts`) logs settled picks and emits `learning_update` events tied to `run_id`.
- Calibration engine (`src/core/metrics/calibrationEngine.ts`, `/api/metrics/calibration`) aggregates verdict/outcome runs into deterministic TAKE accuracy, weakest-leg predictive accuracy, confidence buckets, and phase-1 decision profile flags.
