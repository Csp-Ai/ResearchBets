# Repo State Audit

Generated: 2026-02-27T01:57:30.881Z

## Phase Classification
- Current Phase: 4 / 7 (Connected workflow foundation)
- Next Phase Criteria:
  1. Canonical query spine enforced app-wide.
  2. Unified board truth for board + slip + research.
  3. Provider-health coupled mode messaging.

## Workflow Replacement Checklist
- Board: /today + /api/today + board service ✅
- Scout/Stress: /stress-test + /research ✅
- Slip: /slip wired to /api/today ✅
- Control: /control continuity hooks ⚠️ partial

## Nervous System Continuity Report
- Spine set at NervousSystemContext and ContextHeaderStrip.
- Spine read via nervous.toHref in shell/top journeys.
- Remaining explicit allowlisted legacy routes still use raw href/push.

## IP Surface Map
1. Board resolver: src/core/board/boardService.server.ts
2. Slip intelligence: src/core/slips/slipIntelligence.ts
3. Mode policy: src/core/live/modeResolver.server.ts
4. Continuity contract: src/core/nervous/spine.ts + routes.ts
5. Audit tooling: this script + toHref guard

## Top Risks (10)
1. Legacy routes bypass toHref.
2. Limited player richness in board payload.
3. Provider outages can reduce confidence.
4. Incomplete ROI telemetry joins.
5. Sparse multi-book odds.
6. Slip mapping uses preview props only.
7. Control page still has detached CTAs.
8. Mixed tab/query conventions.
9. Missing e2e continuity assertions.
10. Limited timezone coverage defaults.

## Top Refactors (10)
- Expand board payload for active players + last5 + books.
- Remove remaining allowlist entries for toHref guard.
- Unify trace naming to trace_id in all routes.
- Add continuity e2e route-walk test.
- Add provider-health cache and hysteresis.
- Tie telemetry events to bet outcomes and ROI.
- Promote Context Header Strip to dedicated layout slot.
- Normalize mode fallback copy in all cards.
- Add board coverage meter as typed primitive.
- Harden slip hydration from board ids.

## 30-Day Plan
- Week 1: eliminate allowlist + trace cleanup + tests.
- Week 2: enrich board payload and slip mapping.
- Week 3: ROI telemetry and control-room joins.
- Week 4: ship continuity e2e + investor-facing evidence pass.

## Repository Size Snapshot
- App route files: 86

## Post-stabilization drift map

- **A) Query param drift (`trace` vs `trace_id`)**
  - Failing tests: `tests/e2e-smoke-ingest-to-research.test.tsx`, `tests/research-runs.test.tsx`.
  - Canonical contract: UI writes `trace_id` and reads via `trace_id` first with legacy `trace` fallback.
  - Minimal fix: add shared query helper (`getQueryTraceId`, `withTraceId`), adopt it in ingest/research and test expectations.

- **B) Persistence drift (`Run.traceId` vs `trace_id`)**
  - Failing tests: research run hydration/load selectors relying on mixed run identity.
  - Canonical contract: `Run.trace_id` is primary, `traceId` remains optional alias.
  - Minimal fix: add `normalizeRun`, migrate local storage reads/writes to canonical key, preserve legacy read compatibility.

- **C) Route envelope drift (`traceId` alias presence)**
  - Failing tests: `app/api/slips/submit/__tests__/route.test.ts`.
  - Canonical contract: payloads include `trace_id` canonical plus `traceId` alias.
  - Minimal fix: include `traceId` at submit route envelope root and nested data trace object; assert both in test.

- **D) UI render drift (mode/provider semantics)**
  - Failing tests observed in last run were not provider badge regressions; this cluster is currently stable.
  - Canonical contract: existing stabilized mode/provider semantics remain unchanged.
  - Minimal fix: no product copy/semantic changes in this sweep.
