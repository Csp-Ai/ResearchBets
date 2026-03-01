# Contractor Handoff (Cockpit-first)

Minimum must-read set for fast, safe contribution:

- `docs/prototypes/bettor-cockpit.html` — canonical prototype semantics and hero language reference.
- `app/cockpit/page.tsx` — cockpit route entry and server-side integration boundary.
- `app/cockpit/CockpitLandingClient.tsx` — client orchestration for cockpit interactions.
- `app/cockpit/cockpit.css` — cockpit-specific visual contract.
- `app/cockpit/__tests__/*` — cockpit behavior and integration expectations.
- `src/core/routing/cockpitEntry.ts` — canonical entry helper for `/` and `/landing` redirects.
- `src/core/nervous/spine.ts` — truth spine contract (sport/tz/date/mode/trace continuity).
- `src/core/nervous/routes.ts` — route continuity helpers for spine-safe href generation.
- `src/core/providers/registry.server.ts` — provider registration and server-side live/degraded sourcing.
- `scripts/env-check.mjs` — strict vs relaxed environment validation and operator messaging.
- `docs/COCKPIT_CANONICAL_ENTRY.md` — cockpit front-door policy and degradation notes.
- `app/api/today/route.ts` — board intake path with `live|cache|demo` envelope behavior.
- `app/api/slips/submit/route.ts` — ingest submit endpoint used by cockpit run pipeline.
- `app/api/slips/extract/route.ts` — extraction endpoint used by cockpit run pipeline.
- `app/api/analysis/save/route.ts` — analysis persistence endpoint used after cockpit-driven runs.
