# Cockpit canonical entry

## Public entry truth

`/` is the canonical public entry.

- `/` renders the public landing/cockpit experience directly.
- `/cockpit` is a redirect-only compatibility route to `/`.
- `/landing` is a redirect-only compatibility route to `/`.
- Public navigation should reinforce the canonical bettor loop only: `landing -> today/board -> slip -> stress-test -> track -> review`.
- Dev/internal surfaces such as `/control`, `/discover`, and `/ingest` should not be treated as primary public entry points.

## Prototype reference and implementation mapping

The canonical bettor-facing prototype remains `docs/prototypes/bettor-cockpit.html`.
Production cockpit implementation files:

- `app/page.tsx`
- `app/cockpit/CockpitLandingClient.tsx`
- `app/cockpit/cockpit.css`

These are the source of truth for the live App Router landing while preserving the prototype’s bettor-native semantics.

## Canonical front-door routing

ResearchBets treats `/` as the canonical first-load destination.

- `/` renders the landing directly.
- `/cockpit` server-redirects to `/`.
- `/landing` server-redirects to `/`.
- Query spine continuity is preserved (`sport`, `tz`, `date`, `mode`, `trace_id`) and non-spine query params are retained.
- Missing spine keys are normalized to safe defaults:
  - `sport=NBA`
  - `tz=America/Phoenix`
  - `date=today` (server-derived ISO date)
  - `mode=demo` by default unless `LIVE_MODE=true`
  - `trace_id=trace_demo_cockpit` in demo-mode defaults

The canonical landing render path is:

- `app/page.tsx`
- `app/_components/CanonicalLanding.tsx`
- `app/cockpit/CockpitLandingClient.tsx`

Compatibility redirects live in:

- `app/cockpit/page.tsx`
- `app/landing/page.tsx`

## Degradation modes on cockpit

Cockpit surfaces deterministic degraded states without alarmist copy:

- `demo`: deterministic fallback payloads power UI and workflows.
- `cache`: cached/live-adjacent payloads can render while provider health is degraded.
- `live`: provider-backed mode when keys/providers are available.

Degradation status messaging should remain neutral/operational (see cockpit neutral status usage in `app/cockpit/CockpitLandingClient.tsx` and `/api/today` mode/reason contracts).

## Provider-health logging and consolidated warnings

Provider key observability remains in `src/core/providers/registry.server.ts`, but missing-key warnings are consolidated.

Why:

- Avoid repeated, noisy build-time per-provider warnings in demo/cache workflows.
- Preserve a single structured warning with missing key list.

Policy:

- If not live mode: one neutral warning, e.g. `Provider keys missing (demo/cache ok): ...`
- If live mode: one explicit but neutral warning that live mode is missing required keys and fallback providers are active.

This keeps logs actionable while aligning expected demo/cache operation with cockpit-first onboarding.
