# Cockpit canonical entry

## Prototype reference and implementation mapping

The canonical bettor-facing prototype remains `docs/prototypes/bettor-cockpit.html`.
Production cockpit implementation files:

- `app/cockpit/page.tsx`
- `app/cockpit/CockpitLandingClient.tsx`
- `app/cockpit/cockpit.css`

These are the source of truth for the live App Router page while preserving the prototype’s bettor-native semantics.

## Canonical front-door routing

ResearchBets now treats `/cockpit` as the canonical first-load destination.

- `/` server-redirects to `/cockpit` (no client push/flicker).
- `/landing` server-redirects to `/cockpit`.
- Query spine continuity is preserved (`sport`, `tz`, `date`, `mode`, `trace_id`) and non-spine query params are retained.
- Missing spine keys are normalized to safe defaults:
  - `sport=NBA`
  - `tz=America/Phoenix`
  - `date=today` (server-derived ISO date)
  - `mode=demo` by default unless `LIVE_MODE=true`
  - `trace_id=trace_demo_cockpit` in demo-mode defaults

Implementation lives in `src/core/routing/cockpitEntry.ts` and is used by:

- `app/(home)/page.tsx`
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
