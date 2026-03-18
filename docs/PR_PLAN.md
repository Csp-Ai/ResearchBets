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

- **Goal**: make Control Room review default to the real parse/extract pipeline while keeping demo review explicit. This follow-up hardening pass adds provenance metadata, confidence visibility, and a manual OCR recovery loop without softening truthfulness.
- **Touched areas**: `app/(product)/control/*`, review ingestion helpers/tests, OCR recovery UX, continuity handoff docs.
- **Tests to run**: `npm run test -- reviewIngestion ReviewPanel ControlPageClient`.
- **Acceptance criteria**:
  - default review path uses pasted/uploaded input plus real parse/extract-backed ingestion.
  - review output exposes structured provenance (`source_type`, `parse_status`, nullable `parse_confidence`, `had_manual_edits`, `trace_id`, `slip_id`, `generated_at`).
  - screenshot OCR supports an extracted-text preview and manual correction rerun before postmortem.
  - real review failure stays visibly failed/partial; demo/sample review is clearly labeled and never silently substitutes for failed real ingestion.
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

## PR11 — AFTER-stage attribution and feedback engine

- **Goal**: upgrade postmortem from generic deterministic notes into structured weakest-leg attribution that stays continuity-safe and bettor-useful.
- **Touched areas**: `app/api/postmortem/*`, `src/core/postmortem/*`, `app/(product)/control/*`, review ingestion DTO/types, docs.
- **Tests to run**: `npm run lint`, `npm run typecheck`, `npm test -- app/api/postmortem/__tests__/route.test.ts app/(product)/control/__tests__/ReviewPanel.test.tsx`.
- **Acceptance criteria**:
  - `/api/postmortem` returns `weakest_leg`, compact deterministic `cause_tags`, `confidence_level`, and `summary_explanation`.
  - attribution is suppressed when `parse_status=failed`.
  - response and UI preserve `trace_id` + `slip_id` continuity for later comparison/logging.
  - Review Panel renders a compact weakest-leg card, cause-tag chips, and neutral bettor-facing copy.
  - implementation remains deterministic-first, with future LLM summarization optional rather than required.

## PR12 — AFTER-stage bettor mistake profile layer

- **Goal**: extend truthful single-slip attribution into deterministic cross-slip pattern detection for prior reviewed slips.
- **Touched areas**: `src/core/postmortem/*`, `src/core/control/reviewIngestion.ts`, `app/(product)/control/*`, focused tests, docs.
- **Tests to run**: `npm run lint`, `npm run typecheck`, `npm run test -- app/api/postmortem/__tests__/route.test.ts app/(product)/control/__tests__/ReviewPanel.test.tsx src/core/postmortem/__tests__/patterns.test.ts`.
- **Acceptance criteria**:
  - pattern summary model exposes `recurring_tags`, `common_failure_mode`, `sample_size`, `confidence_level`, `recommendation_summary`, and `recent_examples`.
  - aggregation uses canonical `trace_id` / `slip_id` from reviewed attribution records; demo reviews and failed parses do not count.
  - one isolated reviewed slip does not create a high-confidence pattern.
  - Review Panel shows a compact “Your patterns” module only when data supports it, with truthful low-confidence language otherwise.
  - implementation remains deterministic, explainable, and storage-adapter friendly for future durable history.
