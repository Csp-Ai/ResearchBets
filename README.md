# ResearchBets

**ResearchBets is a bettor lifecycle OS** for turning game-day ideas into disciplined slips, stress-tested decisions, and repeatable postmortem learning.

## Lifecycle OS (canonical flow)

1. **Landing** (`/`) — rendered by App Router at `app/page.tsx` using `HomeLandingClient` → `src/components/landing/HomeLandingPage.tsx`.
2. **Slip** (`/slip`) — build a draft slip and see live fragility/correlation intelligence.
3. **Stress Test** (`/stress-test`) — run deterministic extraction + risk analysis before placing.
4. **Control** (`/control`) — monitor live risk and run review mode for settled slips.
5. **Review / Improve** (`/control?tab=review`) — classify what failed and what to change next.

Legacy aliases are preserved for continuity:

- `/discover` → `/slip`
- `/research` → `/stress-test`
- `/live` → `/control?tab=live`

## New user journey in 60 seconds (guest)

1. Open `/` and pick a prop from the today board.
2. Add it to draft and jump to `/slip`.
3. Build your slip and check `SlipIntelBar` for correlation + volatility warnings.
4. Hit **Stress Test** to run analysis on `/stress-test`.
5. Open `/control` to monitor live risk deltas.
6. After result, use review mode with an uploaded slip image to generate a postmortem.

No account is required for this loop; draft and recent postmortem state are stored locally first.

## Demo vs Live modes

ResearchBets is deterministic-first and degrades safely.

- **Demo mode (default):**
  - `LIVE_MODE` is unset/false.
  - `/api/today` serves deterministic slate data and can return `mode: demo` or cached payloads.
  - Live market APIs and outcome APIs use demo-first snapshots and deterministic fallbacks.
- **Live mode:**
  - In production, live mode now defaults on when any canonical live key exists (`SPORTSDATA_API_KEY`, `ODDS_API_KEY`, `THEODDSAPI_KEY`).
  - `LIVE_MODE=true|false` still overrides explicitly.
  - `src/core/live/modeResolver.server.ts` is the single resolver for `live | demo`, reason code, and public label.
  - In production runtimes, landing routes stay live-first when keys exist; on provider failure they fall back to deterministic demo safely.

## Local development

### 1) Install + start (offline/demo)

```bash
npm ci
cp .env.local.example .env.local
npm run dev
```

This works in demo mode with graceful degradation for Supabase-backed features.

### 2) Full mode (Supabase + providers)

Set at minimum:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
# optional alias supported by env checker:
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<server-only>
LIVE_MODE=true
```

Optional provider keys for richer live context:

```bash
ODDS_API_KEY=<key>
SPORTSDATA_API_KEY=<key>
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

Common fix for failures: copy `.env.local.example`, add `NEXT_PUBLIC_SUPABASE_URL` and one public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`), then restart dev server.


## Repo Grounding

- Canonical home routing chain is `app/page.tsx` (server wrapper with `Suspense`) → `app/HomeLandingClient.tsx` → `src/components/landing/HomeLandingPage.tsx`.
- Keep one spine for internal navigation: `nervous.toHref()` + `appendQuery()` on route transitions.

### Key routes (BEFORE / DURING / AFTER)

- **BEFORE placement**: `/`, `/today`, `/slip`, `/ingest`.
- **DURING decisioning**: `/stress-test`, `/research` (alias redirect).
- **AFTER placement**: `/control`, `/control?tab=review`, `/live` (alias redirect).

### Demo vs live contract

- Demo mode remains deterministic-first and should continue to return useful payloads without external provider keys.
- Live mode attempts provider-backed data and safely degrades to cached/demo payloads with explicit `mode` and optional reason labels.

### Guardrails

```bash
npm run verify:landing
npm run typecheck
npm run lint
npm run build
```

### Sprint 6 focus

- Performance: lazy-load heavy OCR and non-critical panels so ingest/stress-test/control show value faster.
- Prune: reduce duplicate/legacy variants and keep canonical entry points authoritative.
- Spine: preserve query/context continuity through `nervous.toHref()` + `appendQuery()`.

## Landing page wiring

- Canonical home route is `/`, served by App Router in `app/page.tsx` and rendered by `HomeLandingClient` + `HomeLandingPage`.
- `public/landing.html` is optional legacy/reference content and is **not** the canonical home route.
- Run `npm run verify:landing` to enforce this contract in local/CI checks.
- No placeholder routes were added: `/ingest`, `/research?demo=1`, `/ingest?mode=screenshot`, and `/control` already exist in the app router.

## Key routes

| Route | Purpose |
| --- | --- |
| `/` | Canonical App Router home route rendered by `app/page.tsx` (`HomeLandingClient` → `HomeLandingPage`). |
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

## Docs index

- `docs/ARCHITECTURE.md` — system/data flow and deployment model.
- `docs/PRODUCT.md` — product positioning, user journey, and promises.
- `docs/CHANGELOG_HACKATHON.md` — recent sprint-level lifecycle changes.
- `docs/SETUP.md` — extended setup/deployment details.

## Dependency notes

- `autoprefixer` and `postcss` remain because `postcss.config.js` and Tailwind CSS processing depend on them.
- `knip` remains because `audit:unused` scripts execute `npx knip` for prune visibility.

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


## Canonical provider envs

Use these exact variable names for live feeds:

- `SPORTSDATA_API_KEY`
- `ODDS_API_KEY`
- `THEODDSAPI_KEY` (legacy alias still supported)
