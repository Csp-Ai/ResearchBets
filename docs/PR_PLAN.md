# Prioritized PR Plan

## PR1 — Guard diagnostics runtime invariants

- **Goal**: keep provider/env diagnostics on Node runtime.
- **Touched areas**: `app/api/env/status/route.ts`, tests for diagnostics runtime declarations.
- **Tests to run**: `npm run check`.
- **Acceptance criteria**:
  - `/api/env/status`, `/api/odds/probe`, `/api/provider-health` all declare `runtime = 'nodejs'`.
  - Guard test fails if declaration drifts.

## PR2 — Bettor loop continuity identity

- **Goal**: issue `slip_id` and `trace_id` on first meaningful draft action, then preserve them through `/today -> /slip -> /stress-test -> /track -> /control`.
- **Touched areas**: draft slip store/hook, nervous spine, stress-test pipeline, track/control handoff.
- **Tests to run**: `npm run test -- draftSlipStore runSlip spineNavigation TrackPageClient.query`.
- **Acceptance criteria**:
  - first staged leg issues stable `slip_id` + `trace_id`.
  - draft navigation reuses the same continuity identity instead of regenerating it.
  - stress-test and track reuse pre-issued identity in demo/local fallback as well as normal flows.

## PR3 — AFTER-stage truthful review ingestion

- **Goal**: make Control Room review default to the real parse/extract pipeline while keeping demo review explicit.
- **Touched areas**: `app/(product)/control/*`, `/api/postmortem`, review ingestion helpers/tests, continuity handoff docs.
- **Tests to run**: `npm run test -- reviewIngestion ReviewPanel postmortem parseText runSlip`.
- **Acceptance criteria**:
  - default review path uses pasted/uploaded input plus real parse/extract-backed ingestion.
  - demo/sample review is clearly labeled and never silently substitutes for failed real ingestion.
  - existing `trace_id`/`slip_id` continuity is preserved into review/postmortem where available.

## PR4 — Spine-aware API URL helper

- **Goal**: unify query construction for API calls carrying `trace_id/mode/sport/tz/date`.
- **Touched areas**: shared helper module + callers in cockpit/research/live.
- **Tests to run**: `npm run check`.
- **Acceptance criteria**:
  - no ad hoc spine query assembly in targeted modules.
  - helper has tests for merge/override behavior.

## PR5 — Mode resolver convergence

- **Goal**: reduce multi-stack mode drift.
- **Touched areas**: `live/modeResolver.server.ts`, `mode/policy.ts`, `useCockpitToday`.
- **Tests to run**: `npm run check`.
- **Acceptance criteria**:
  - one canonical mode decision source.
  - UI path consumes derived result without re-implementing logic.

## PR6 — Landing redirect normalization hardening

- **Goal**: keep backward compatibility while normalizing known spine keys.
- **Touched areas**: `src/core/routing/preserveQueryRedirect.ts`, redirect tests.
- **Tests to run**: `npm run check`.
- **Acceptance criteria**:
  - spine aliases normalize to canonical keys on redirect.
  - unknown keys still preserved.

## PR7 — Telemetry schema proactive guard

- **Goal**: detect `events_analytics` schema drift before runtime emits degrade.
- **Touched areas**: analytics schema check helper + diagnostics exposure.
- **Tests to run**: `npm run check`.
- **Acceptance criteria**:
  - proactive check validates required table/columns.
  - degradation warnings become actionable with explicit status.

## PR8 — Contract-indexed response guard tests

- **Goal**: enforce additive-safe shape continuity for critical DTO/envelopes.
- **Touched areas**: tests for today envelope, run DTO, trace/event envelope.
- **Tests to run**: `npm run check`.
- **Acceptance criteria**:
  - test fixtures parse through canonical schemas.
  - accidental contract breaks fail CI.

## PR9 — Registry-only provider access policy

- **Goal**: prevent provider stack fragmentation.
- **Touched areas**: lint/test guard for provider factory imports in routes/services.
- **Tests to run**: `npm run check`.
- **Acceptance criteria**:
  - external-facing flows resolve providers through `getProviderRegistry`.
  - exceptions documented explicitly.

## PR10 — Archive containment and deprecation notes

- **Goal**: reduce accidental dependency on archived UI.
- **Touched areas**: `src/components/_archive/*`, docs.
- **Tests to run**: `npm run check`.
- **Acceptance criteria**:
  - archive modules are clearly marked non-canonical.
  - imports from active surfaces are blocked or warned.
