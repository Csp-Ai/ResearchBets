# ResearchBets Repo Audit (v0.7 → v1.0)

Repo: `Csp-Ai/ResearchBets`  
Audit date: 2026-03-01T05:40:00Z  
Method: Static inspection + required command outputs

## 1) Executive Summary

- The repo has a strong deterministic-first posture for Today and slip pipelines, with explicit fallback semantics.
- Route-group isolation exists (`app/(home)` vs `app/(product)`), but **shared chunks remain near-universal** (94.9% ownership), muting isolation gains.
- Canonical nervous-system helpers exist (`normalizeSpine`, `toHref`), but **direct href bypasses** still appear in bettor-facing surfaces.
- Trace continuity is generally present, but **home entry CTAs hardcode query strings and omit `trace_id`**, breaking the canonical spine on first hop.
- Snake_case ID boundary policy is partially enforced; multiple APIs intentionally emit both `trace_id` and `traceId`, creating contract drift.
- DURING telemetry is present end-to-end, but polling currently refetches the same window repeatedly (no cursor/since), adding avoidable load.
- Today truth has a never-empty fallback path in non-strict mode; strict live semantics explicitly allow empty payloads with reason.
- Governance checks are active, but `check:governor` currently tolerates known client/server boundary violations.
- Dev/mirror endpoints are disabled in launch branch and gated in prod, reducing immediate exposure risk.
- No obvious service-role key leakage in client code from inspected files.
- `src/legacy/landing/*` appears orphaned from active app imports, adding maintenance confusion.

## 2) v1.0 North Star Scorecard

| Dimension | Score (0–5) | Status | Notes |
|---|---:|---|---|
| Spine continuity | 3.5 | 🟡 Partial | Good infrastructure, but home/manual links still bypass canonical spine helpers. |
| Never-empty truth | 4.5 | 🟢 Strong | Demo/cache fallback robust; strict-live intentionally returns explicit empty state. |
| DURING observability | 3.5 | 🟡 Partial | Event taxonomy and tracker exist; polling strategy is inefficient at scale. |
| Trust-safe copy | 4.0 | 🟢 Mostly | Safe fallback language present; minor debug/dev affordances still nearby. |
| Performance first fold | 2.5 | 🟠 Needs work | Home still 172k first load; two near-universal shared chunks at 94.9%. |
| Governance/security | 3.5 | 🟡 Partial | Guards run and pass, but known boundary violations are explicitly tolerated. |

## 3) Findings

### A) Product “North Star” Alignment

#### F-001 — Home entry CTAs bypass canonical spine and lose `trace_id` continuity
**Evidence**
- `app/(home)/page.tsx:L23-L25`
  - `href: \`/today?sport=${spine.sport}&tz=${spine.tz}&date=${spine.date}&mode=${spine.mode}\``
  - Similar manual strings for `/stress-test` and `/control`.
- `src/core/nervous/routes.ts:L5-L14` defines canonical `toHref(path, spine, overrides)`.

**Impact**
- **Bettor trust:** Trace continuity can disappear at first click, weakening “same run” confidence.
- **PM:** Loop analytics attribution across `/` → product routes becomes noisier.
- **UX:** Inconsistent query behavior depending on entry path.
- **Eng:** More duplicated URL composition logic.
- **VC:** Harder to prove lifecycle coherence in demos/metrics.

**Fix recommendation**
- Replace manual string interpolation in home CTA actions with `toHref(...)`.
- Ensure `trace_id` is propagated on home-originated navigations.
- Add a focused test asserting CTA hrefs preserve the full nervous spine.

**Effort:** S  
**Risk:** Low

#### F-002 — Bettor-facing direct-link bypasses remain outside nervous routing helper
**Evidence**
- `src/components/bettor/GuidedActionsCard.tsx:L37` → `<Link href="/dashboard" ...>`
- `src/components/landing/PostmortemPreviewCard.tsx:L20-L24` → hardcoded `/control?...`
- `src/components/landing/VerdictMock.tsx:L5` → hardcoded `/ingest`
- Guard scan output (`.tmp-audit/05_nav_bypass.txt`) lists these as direct absolute links.

**Impact**
- **Bettor trust:** Context state can silently reset on cross-surface jumps.
- **PM:** Funnel metrics fragment when links don’t carry spine params.
- **UX:** Users may land in different mode/date/sport context than expected.
- **Eng:** Ongoing regressions unless normalized.
- **VC:** Product narrative (“single truth spine”) appears inconsistent.

**Fix recommendation**
- Standardize bettor-facing links through `nervous.toHref(...)`/`toHref(...)` + `appendQuery`.
- Keep absolute links only for intentional hard resets; annotate those with comments.
- Extend `tohref-guard` to flag these specific component directories.

**Effort:** M  
**Risk:** Low

### B) Architecture & Contracts

#### F-003 — ID contract drift: snake_case and camelCase are both emitted at API boundaries
**Evidence**
- `app/api/today/route.ts:L40` and `L47` return both `trace_id` and `traceId`.
- `app/api/events/route.ts:L62-L64`, `L77`, `L81`, `L83` return both `trace_id` and `traceId`.
- `src/core/nervous/spine.ts:L26` accepts `trace_id` plus `trace`/`traceId` aliases.

**Impact**
- **Bettor trust:** Inconsistent telemetry stitching can yield missing/duplicated run trails.
- **PM:** Contract ambiguity complicates dashboard/reporting definitions.
- **UX:** Occasional state desync if clients choose different key variants.
- **Eng:** Higher cognitive load and adapter sprawl.
- **VC:** Harder to defend a disciplined platform contract.

**Fix recommendation**
- Enforce snake_case (`trace_id`, `slip_id`) at all external API boundaries.
- Keep camelCase only in internal TS models if needed; convert at edge adapters.
- Add a boundary contract test/lint guard rejecting `traceId` in API JSON payloads.

**Effort:** M  
**Risk:** Med

#### F-004 — DURING polling model refetches full windows without incremental cursoring
**Evidence**
- `src/hooks/useTraceEvents.ts:L77` fetches `/api/events?trace_id=...&limit=...` on every poll.
- `src/hooks/useTraceEvents.ts:L108-L110` repeats every 2000–3000ms.
- `app/api/events/route.ts:L72-L77` supports only `limit`; no `since`/cursor/filter.

**Impact**
- **Bettor trust:** Under load, delayed/jerky updates can reduce “alive” confidence.
- **PM:** Less reliable perceived real-time during demos.
- **UX:** Higher chance of flicker/stale transitions in tracker surfaces.
- **Eng:** Unnecessary client dedupe/sort work every tick.
- **VC:** Scalability concerns for concurrent session growth.

**Fix recommendation**
- Add `since` timestamp or cursor token to `GET /api/events`.
- Have hook request deltas and append in-order, avoiding full-window merges.
- Add polling/backoff heuristics tied to page visibility and idle state.

**Effort:** M  
**Risk:** Med

### C) Performance & Bundle Hygiene

#### F-005 — Shared chunk near-universality indicates weak practical isolation despite route groups
**Evidence**
- Build output (`.tmp-build-output.txt`): `First Load JS shared by all 87.7 kB`.
- `docs/audit/shared-chunk-owners.md:L13-L14`, `L33-L34` show chunks `fd9d1056` and `2117` owned by **37/39 routes (94.9%)**, including `/(home)/page`.
- Build output lists `/` first load at **172 kB**.

**Impact**
- **Bettor trust:** Slower first paint undermines “board truth in first 5 seconds.”
- **PM:** Lower conversion on cold visits.
- **UX:** Reduced responsiveness on lower-end devices.
- **Eng:** Harder to attribute route-level performance wins.
- **VC:** Efficiency narrative weakened for scale/readiness.

**Fix recommendation**
- Audit `app/layout.tsx` and shared client dependencies for hoistable/non-critical code.
- Push non-critical landing modules behind conditional/dynamic boundaries.
- Add CI budget on home route first-load + near-universal chunk ownership threshold.

**Effort:** L  
**Risk:** Med

### D) Security & Governance

#### F-006 — Governor check intentionally tolerates existing client/server boundary violations
**Evidence**
- `scripts/check-governor.mjs:L20` defines `knownViolations`.
- `scripts/check-governor.mjs:L31` logs: `known boundary violations tolerated: ...`.
- Runtime command output confirms tolerated files: `src/components/research/ScoutTabPanel.tsx`, `LiveTabPanel.tsx`, `ResearchPageContent.tsx`.

**Impact**
- **Bettor trust:** Latent boundary bugs can surface as unstable data behaviors.
- **PM:** “Green checks” may mask real architecture debt.
- **UX:** Client bundle/server boundary mistakes can cause subtle breakage.
- **Eng:** Normalizes exceptions and slows cleanup.
- **VC:** Governance posture appears softer than v1.0 claims.

**Fix recommendation**
- Create time-boxed plan to eliminate each known violation and remove allowlist entries.
- Fail CI on any remaining tolerated boundary violations after cutoff.
- Add per-file owner and migration notes in governor report output.

**Effort:** M  
**Risk:** Med

### E) Deadweight & Orphans

#### F-007 — Legacy landing module tree appears orphaned from active entry graph
**Evidence**
- `rg` references to `src/legacy/landing/*` show only self-imports (no app/product imports).
- Example files: `src/legacy/landing/LandingHero.tsx`, `StaticVerdictDemo.tsx`, `HowItWorks.tsx`.
- Active app pages use `src/components/landing/*` instead (`app/(home)/page.tsx`, `app/HomeLandingClient.tsx`).

**Impact**
- **Bettor trust:** None directly, but stale code increases defect risk.
- **PM:** Slower audits/onboarding due to mixed “current vs old” surfaces.
- **UX:** Potential accidental reuse of outdated UX patterns.
- **Eng:** Repository complexity and review noise.
- **VC:** Perceived product maturity can be diluted by visible deadweight.

**Fix recommendation**
- Confirm no runtime/test dependency on `src/legacy/landing/*`.
- Archive or remove orphaned legacy modules and document the migration endpoint.
- Add a periodic dead-code check for unreferenced folders under `src/legacy`.

**Effort:** S  
**Risk:** Low

## 4) 48–72 hour PR Plan

1. **PR-1 (Spine continuity hardening, ≤10 files)**
   - Convert home and flagged bettor-facing direct links to `toHref`/`nervous.toHref`.
   - Add/extend guard test to fail on new direct absolute links in bettor surfaces.

2. **PR-2 (Boundary contract normalization, ≤10 files)**
   - Standardize API responses to snake_case IDs at boundaries (`trace_id`, `slip_id`).
   - Add adapter utilities for internal camelCase conversion where needed.
   - Add contract tests for key routes (`/api/today`, `/api/events`, slips routes).

3. **PR-3 (DURING event efficiency, ≤10 files)**
   - Add `since` or cursor support to `/api/events`.
   - Update `useTraceEvents` to incremental fetch + adaptive polling/backoff.
   - Add one tracker-level test for ordered append + dedupe behavior.

## 5) Appendix — Required Command Outputs (trimmed)

### 5.1 Repo map
See: `.tmp-audit/01_repo_map.txt`
- `ls -la`
- `rg -n "app/\(home\)|app/\(product\)" -S app | head -n 200`
- `rg -n "NervousSystemProvider|useNervousSystem|toHref\(" app src | head -n 200`

### 5.2 Truth spine + routes
See: `.tmp-audit/02_spine_routes.txt`
- `sed -n '1,220p' src/core/nervous/spine.ts`
- `sed -n '1,220p' src/core/nervous/routes.ts`
- `sed -n '1,260p' src/components/nervous/NervousSystemContext.tsx`

### 5.3 Today truth + fallback
See: `.tmp-audit/03_today_truth.txt`
- `sed -n '1,320p' src/core/today/service.server.ts`
- `sed -n '1,260p' app/api/today/route.ts`
- `rg -n "MIN_BOARD_ROWS|ensureBoard|getDemoFallback|strictLive|strict_live" src/core/today -S`

### 5.4 DURING events + tracker
See: `.tmp-audit/04_during_events.txt`
- `sed -n '1,280p' src/core/control-plane/events.ts`
- `sed -n '1,360p' src/core/pipeline/runSlip.ts`
- `sed -n '1,260p' src/hooks/useTraceEvents.ts`
- `sed -n '1,320p' src/components/track/DuringStageTracker.tsx`

### 5.5 Navigation bypass scan
See: `.tmp-audit/05_nav_bypass.txt`
- `rg -n 'href="/|href=\{\x27/|router\.push\("/|router\.push\(\x27/' app src -g '*.{ts,tsx}'`
- `node scripts/audit/tohref-guard.mjs` → passed
- `node scripts/audit/casing-guard.mjs` → passed

### 5.6 Bundle + chunk audits
See: `.tmp-audit/06_bundle_chunk.txt` and `.tmp-build-output.txt`
- `npm run build | tee .tmp-build-output.txt`
- `node scripts/audit/bundle-budget.mjs --file .tmp-build-output.txt` → ok
- `npm run audit:shared-chunk-owners`
- `npm run audit:chunk-fingerprint`

### 5.7 Governance + import guards
See: `.tmp-audit/07_governance_guards.txt`
- `npm run check:governor` → passes with tolerated known boundary violations
- `npm run check:landing-imports` → ok
- `npm run audit:ui-primitives-import-guard` → ok
