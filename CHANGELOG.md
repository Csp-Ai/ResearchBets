# Changelog

## 0.2.0 - 2026-03-01

### Added
- Added `docs/RELEASE.md` with a repeatable release checklist for local validation, redirect verification, env-check modes, provider-warning checks, and Vercel deploy sanity review.
- Added `docs/CONTRACTOR_HANDOFF.md` with a cockpit-first must-read map for rapid onboarding.

### Changed
- Promoted cockpit as canonical entry for onboarding: `/` and `/landing` now server-redirect to `/cockpit` with preserved spine/query continuity.
- Consolidated provider missing-key warnings to keep build/runtime logs neutral while preserving deterministic demo/cache behavior.
- Updated env-check messaging to cockpit-directed, neutral degradation language.
- Resolved `allowedDevOrigins` warnings in dev/build flow.
- Updated docs and tests around canonical cockpit entry (`src/core/routing/cockpitEntry.ts`) and redirect behavior (`tests/canonical-entry-redirects.test.ts`, cockpit route tests).
- Updated CI web quality gates to include `npm run build` and an explicit canonical entry policy log line.
