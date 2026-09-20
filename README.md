# ResearchBets

ResearchBets is the **decision intelligence layer for parlays — from idea to settlement**. Its initial wedge is a Structural Risk Terminal: research and shape a thesis, build the ticket, X-Ray its fragility, monitor its verified live Pulse, and turn settlement into Autopsy and Memory.

## Canonical entry + continuity spine

- Canonical public entry: `/`
- Canonical bettor loop: `Discover + Build -> Ticket X-Ray -> Ticket Pulse -> Ticket Autopsy + Memory`
- Canonical workflow routes: `/`, `/stress-test`, `/pulse`, `/review`
- Supported alternate entries during convergence: `/today`, `/slip`, `/ingest`
- Redirect-only compatibility routes: `/cockpit`, `/landing`, `/research`, `/live`
- Dev/internal surfaces stay out of public navigation: `/control`, `/discover`, `/ingest`, `/dashboard`, `/tonight`, `/history`, `/community`

Truth spine query params are preserved across navigation:

- `trace_id`
- `sport`
- `tz`
- `date`
- `mode`
- `tab` (where relevant)

See route and continuity details in [docs/ROUTES.md](docs/ROUTES.md).
The authoritative convergence decision record is [docs/CANONICAL_PRODUCT.md](docs/CANONICAL_PRODUCT.md); company strategy is [docs/STRATEGY.md](docs/STRATEGY.md); the active 0→1 execution queue is [docs/EXECUTION_PLAN.md](docs/EXECUTION_PLAN.md); retained historical implementations are governed by [docs/LEGACY_CONTEXT.md](docs/LEGACY_CONTEXT.md).

## Current phase

ResearchBets is currently moving from **Product Truth → Habit**. The immediate goal is a fast, truthful, coherent lifecycle that makes the value obvious in one session and creates the behavior: **before you place the parlay, X-Ray it.** Broad feature expansion is secondary until that loop is proven.

## Quickstart (demo-safe local)

```bash
npm ci
cp .env.local.example .env.local
npm run dev
```

Open <http://localhost:3000>.

This path is deterministic and safe without provider credentials. The UI still feels alive in demo mode and keeps truth spine continuity.

For full live/provider setup, see [docs/SETUP.md](docs/SETUP.md).

## Runtime modes (truthful UI contract)

ResearchBets supports three runtime modes:

- `demo`: deterministic fallback payloads
- `cache`: cached/degraded provider path
- `live`: provider-backed path

UI labels must follow API payload truth (`TodayPayload.mode` + provenance) instead of local overrides. See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

## Today cache warming (deployment truth)

- `POST /api/today/warm` is the canonical warm endpoint (requires `CRON_SECRET`).
- `vercel.json` uses a **daily** cron schedule so the repo remains Vercel Hobby-compatible.
- Higher-frequency warming (for example every 15 minutes) is plan-dependent and should be configured only on supported tiers.
- Product behavior does **not** depend on cron success: `/api/today` still falls back through live → cache → deterministic demo.

## Quality checks

Primary governor:

```bash
npm run check
```

Helpful local checks:

```bash
npm run verify:landing
npm run env:check
npm run docs:check
```

`docs:check` includes a README size guardrail to keep this file as a front door only. Move long-form detail into `docs/*`.

## Documentation map

Core docs:

- [docs/CANONICAL_PRODUCT.md](docs/CANONICAL_PRODUCT.md)
- [docs/STRATEGY.md](docs/STRATEGY.md)
- [docs/EXECUTION_PLAN.md](docs/EXECUTION_PLAN.md)
- [docs/SETUP.md](docs/SETUP.md)
- [docs/ROUTES.md](docs/ROUTES.md)
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- [docs/APIS.md](docs/APIS.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/RELEASE.md](docs/RELEASE.md)

Audit and operations docs:

- [docs/REPO_AUDIT.md](docs/REPO_AUDIT.md)
- [docs/repository-systems-audit.md](docs/repository-systems-audit.md)
- [docs/observability.md](docs/observability.md)

## Contributing notes

- Keep README concise (front-door navigation, not deep specs).
- Add deep technical content to `docs/*` and link from here.
- Preserve truth spine continuity in page and API links.
- Keep demo mode deterministic and secret-safe.
- Prefer subtraction over adding another panel when the same user question can be answered more clearly.
- Recommendation strength must not outrun available evidence.

## Bettor memory foundation

- Bettor profile persistence now extends the existing `profiles` table with timezone, preferred sportsbooks, bettor identity, advisory signals, and historical aggregate fields.
- Screenshot uploads persist into the `bettor-artifacts` storage bucket and `bettor_artifacts` table. Parsed outputs save into `bettor_slips`, `bettor_slip_legs`, `bettor_account_activity_imports`, and `bettor_postmortems`.
- Bettor-memory parsing now runs through a sportsbook parser adapter registry (`FanDuel`, `DraftKings`, `PrizePicks`, plus a conservative generic fallback). Adapter provenance, parser warnings/errors, normalized candidate output, and review-needed recommendations persist alongside the raw upload without replacing bettor verification.
- When OCR/parser certainty is unavailable, the app uses an explicit `demo-parser-v1` contract and labels outputs as `needs_review` instead of presenting them as verified truth.
- `/profile` now acts as the bettor-facing Performance Intelligence surface, while `/history` acts as the bettor memory archive.
- `/profile`, `/history`, and `/api/postmortem` now expose deterministic verified-coverage metadata so bettors can see how much of analytics and post-mortems are backed by bettor-reviewed records versus parser/demo/failure states.
- Ticket thesis composition now lives in `src/core/slips/ticketThesis.ts`, which composes the canonical lifecycle risk/action/evidence spine into one compact bettor-facing narrative reused across BEFORE (`/slip`), DURING (`/track`), and AFTER (`/control`, `/review`) surfaces.
