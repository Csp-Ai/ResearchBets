# ResearchBets

**ResearchBets is a bettor lifecycle OS** for turning game-day ideas into disciplined slips, stress-tested decisions, and repeatable postmortem learning.

## Lifecycle OS (canonical flow)

1. **Board** (`/`) — scan today's slate, shortlist prop ideas, and queue legs.
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
  - Set `LIVE_MODE=true` and provide real provider + Supabase keys.
  - `/api/today` attempts provider aggregation; if provider calls fail it falls back to deterministic demo payloads with a reason.

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

## Key routes

| Route | Purpose |
| --- | --- |
| `/` | Board: today slate aggregation, filtering, add-to-draft, quick analyze handoff. |
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
