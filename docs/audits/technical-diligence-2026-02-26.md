# ResearchBets Technical Diligence Audit (2026-02-26)

## Executive Summary
ResearchBets is no longer just a landing shell, but it is still **not replacing a real bettor’s manual workflow end-to-end**. The repo has a real deterministic core (`getBoardData`, `runSlip`, `computeSlipIntelligence`) and has made credible progress on live-first + fallback semantics. However, the UX/flow still leaks context, surfaces partial data as if complete, and uses multiple parallel route patterns that fracture continuity.

The strongest architectural move is the unified board resolver (`src/core/board/boardService.server.ts`) feeding both `/api/today` and `/api/bettor-data`. The weakest move is that downstream mapping (`gateway.server.ts`, `/slip`, landing CTAs) still introduces static/demo-heavy glue and context drops, so the “nervous system” is not yet authoritative.

Telemetry exists and has schema rigor (`ControlPlaneEventSchema` + emitter validation), but business utility is mixed: some telemetry is actionable, some is cosmetic labeling. Provider health checks are directionally useful but currently binary and tied to board mode rather than granular provider SLAs.

Bottom line: this is a **Phase 2.5 system (infra hardening + partial workflow replacement)**, not Phase 3 full replacement. It can demo the loop. It cannot yet credibly displace Reddit + ESPN + sportsbook tabs for a serious bettor in production conditions.

---

## Phase 1 — Real-World Workflow Audit

| Step | Covered? | File(s) | API(s) | Missing | Risk | Severity |
|---|---|---|---|---|---|---|
| Select sport (NBA/NFL/etc.) | Partial | `app/api/today/route.ts`, `src/core/board/boardService.server.ts`, `app/api/bettor-data/route.ts` | `GET /api/today`, `GET /api/bettor-data` | `/today` UI fetch omits sport query; defaults to NBA | User-selected sport not consistently propagated | High |
| Resolve timezone (America/Phoenix) | Partial | `src/core/board/boardService.server.ts`, `src/components/nervous/NervousSystemContext.tsx` | `/api/today`, `/api/bettor-data` | `/today` client fetch omits tz query; some links ignore context | TZ can silently reset to default | High |
| List live/upcoming games | Yes (with caveats) | `src/core/board/boardService.server.ts`, `src/core/today/service.server.ts`, `src/components/today/TodayPageClient.tsx` | `/api/today` | Live status heuristic (`idx===0` => live) not provider-grounded | False confidence in live state | Medium |
| Matchups + localized start time | Partial | `src/core/board/boardService.server.ts`, `src/core/today/service.server.ts` | `/api/today` | Demo mapping uses current timestamp for UTC and preformatted demo local time | Temporal realism drift in demo | Medium |
| Active players | Partial | `src/core/bettor/gateway.server.ts`, `src/core/bettor/demoData.ts`, `src/components/research/ResearchPageContent.tsx` | `/api/bettor-data` | Active players are synthetic placeholders in board mapping | Misrepresents depth of research replacement | High |
| Last 5 stats | Partial | `src/core/bettor/gateway.server.ts`, `src/components/research/ResearchPageContent.tsx` | `/api/bettor-data` | L5/L10 are derived from scout hitRate, not true player logs | Bettor-grade trust gap | High |
| Odds across books | Partial | `src/core/board/boardService.server.ts`, `src/core/providers/oddsProvider.ts` (pipeline) | `/api/today`, `/api/bettor-data`, pipeline providers | Board surface shows single consensus text; no multi-book spread UI | Cannot replace line-shopping workflow | High |
| Player props | Yes (basic) | `src/core/board/boardService.server.ts`, `src/core/today/service.server.ts` | `/api/today` | Props are generated heuristics, limited market depth | Shallow prop coverage | Medium |
| Build 2–4 prop slip across games | Partial | `app/slip/page.tsx`, `src/hooks/useDraftSlip.ts`, `src/core/slips/draftSlipStore.ts` | none (local store) | `/slip` uses hardcoded `TODAY_GAMES`; not unified live board | Core slip step detached from board truth | High |
| Analyze weakest leg | Yes | `src/core/slips/slipIntelligence.ts`, `src/components/slips/SlipIntelBar.tsx`, `src/core/pipeline/runSlip.ts` | `POST /api/slips/submit`, `POST /api/slips/extract` | More deterministic than predictive; limited external evidence quality | Useful but still coarse | Medium |
| Track during game | Partial | `app/control/ControlPageClient.tsx` | mixed local + runStore | “Live” tab mostly mock/status text and draft slip deltas | Not true in-game replacement | High |
| Review after game | Partial-strong | `app/control/ControlPageClient.tsx`, `app/api/postmortem/route.ts` | `POST /api/postmortem` | Input path uses mock OCR by filename pattern | Review loop good structure, weak ingestion realism | Medium |

---

## Phase 2 — Nervous System Continuity Audit

### Journey: Landing → Board → Scout → Stress Test → Slip → Control → Research Snapshot

- **sport preserved:** inconsistent.
- **tz preserved:** inconsistent.
- **mode preserved:** inconsistent.
- **date preserved:** often dropped.
- **gameId/propId preserved:** mostly dropped outside scoped deep links.
- **traceId preserved:** mixed (`trace`, `trace_id`, `traceId` conventions coexist).

### Concrete breakpoints

- Static audit reports context-chain breaks and failed journeys (`docs/JOURNEY_REPORT.md`, `docs/CTA_GRAPH.json`).
- Landing CTAs use hardcoded paths (`/ingest`, `/stress-test?demo=1`, `/control?...`) without `toHref` in multiple components.
- `/today` client navigation uses raw `router.push('/slip')` and raw stress-test URL without spine context.
- `/slip` stress-test handoff uses raw URL without spine context.
- `IngestPageClient` redirects to `/research?trace=...` without preserving sport/tz/date/mode.
- Mixed trace param names (`trace`, `trace_id`) require defensive parsing and create fragility.

### toHref / router findings

- `toHref` exists in `NervousSystemContext` and is used in some paths (e.g., `LandingPageClient`, `AppShell`, parts of `ResearchPageContent`).
- Many links still bypass it (landing child components, control links, today/slip/ingest programmatic pushes).

**Nervous System Cohesion Score: 4/10**

---

## Phase 3 — Architecture Alignment with Business Vision

| Area | Assessment |
|---|---|
| AI-powered research replacement | **Yellow/Red** — deterministic engines exist, but board/slip/live surfaces still synthetic in critical bettor steps. |
| Live-first + deterministic fallback | **Green/Yellow** — mode resolver + board fallback are solid; realism of fallback/live labels still uneven in UX. |
| Transparent telemetry | **Yellow** — schema + API exist; decision utility and wording still mixed. |
| Repeatable Before→During→After loop | **Yellow** — routes and modules exist, but continuity and realism gaps prevent full replacement. |

### Specific architecture calls

- `boardService.server.ts`: **Green** (centralized resolver, fallback, mode/reason contract).
- `gateway.server.ts`: **Yellow/Red** (useful adapter but largely transforms board into synthetic bettor payload; not deep orchestration).
- Agent differentiation: **Yellow/Red** (many “agent” references are taxonomy/UI copy rather than independently optimized agents).
- Telemetry: **Yellow** (structured event model, but not yet clearly tied to bettor-facing performance loops).
- `provider-health`: **Yellow** (useful smoke check; currently coarse and board-mode-proxy).
- Deterministic fallback trust: **Yellow** (deterministic yes, but demo realism and data density still limited).

---

## Phase 4 — Intellectual Property Mapping

| IP Surface | Description | Defensibility | Replaceable? | Needs Strengthening? |
|---|---|---|---|---|
| `boardService.server.ts` | Unified live/demo board envelope + mode semantics + scout deep-link params | Medium | Partially | Yes |
| `gateway.server.ts` | Board-to-bettor adaptation + fallback analytics event | Low/Medium | Yes | Yes |
| `modeResolver.server.ts` | Runtime mode policy and reason taxonomy | Medium | Yes | Moderate |
| `NervousSystemContext` | Query-spine context contract and `toHref` propagation helper | Medium | Yes | High (adoption) |
| CTA/Journey audit tooling | Static graph + journey report generation | Medium | Yes | Moderate |
| Journey testing (`tests/journey.spec.ts`) | Canonical flow assertions/screenshots | Medium | Yes | High (stability + runtime availability) |
| Unified board envelope (`BoardData`) | Shared contract powering multiple APIs | Medium/High | Partially | Moderate |
| Deterministic fallback logic | Reliable non-crashing degraded path | Medium | Yes | High (increase realism + explicit confidence) |

Defensible core is emerging in **workflow-specific deterministic decision logic + continuity contracts**; current moat is implementation discipline, not hard-to-replicate model IP.

---

## Phase 5 — Product Phase Classification

### Current phase: **Phase 2 (Infrastructure hardening), approaching Phase 3**

### Evidence
- Unified mode + fallback and board resolver are in place.
- Core risk/postmortem engines exist and are deterministic.
- Journey/CTA audits actively identify continuity debt.
- But manual bettor replacement is incomplete due to context drops, synthetic datasets, and partial live depth.

### To fully reach Phase 3 (Workflow replacement)
1. Enforce context spine end-to-end (`toHref`/central nav contract only).
2. Replace hardcoded `/slip` game data with unified board-backed source.
3. Elevate board depth: real active players, true L5/L10 logs, multi-book odds spread.
4. Unify trace identity (`trace_id` canonicalization).
5. Make control live tab consume real live feed/state transitions, not mostly mock presentation.

### To reach Phase 4 (Cohesion & inevitability)
1. Single orchestrator contract across board/scout/stress/control with typed provenance.
2. Telemetry tied to decision-quality KPIs (CLV, hit-rate calibration, avoided bad slips).
3. Strong regression gate: journey audits block merge on context break.
4. Rich deterministic fallback parity with live schema completeness.

---

## Phase 6 — UX Reality Check

- Landing: still **marketing-first with product proof modules**, not a pure artifact terminal.
- “Live feeds on”: technically backed by mode resolver, but trust diluted by synthetic surfaces downstream.
- Telemetry labeling: present but language feels productized more than operator-grade.
- Board density: improving, still not dense enough for heavy bettor workflow replacement.
- “Replace Reddit + ESPN + FanDuel?”: **Not yet**.

### Scores (1–10)
- **Utility:** 6
- **Clarity:** 7
- **Continuity:** 4
- **Trust:** 5
- **Professionalism:** 7

---

## Phase 7 — Technical Debt & Risk Scan

| Issue | Location | Impact | Severity | Fix Recommendation |
|---|---|---|---|---|
| Hook dependency warning | `src/components/research/ResearchPageContent.tsx` | Stale effect behavior risk | Medium | Add missing dependency or refactor effect scopes |
| Env-check warning friction | `scripts/env-check.mjs` runtime output | Dev confusion/noise for demo users | Medium | Add clearer “expected in demo” gating and one-line suppress guidance |
| Next config origin warning exposure | `next.config.mjs` lacks explicit dev-origin policy | Local cross-origin friction | Low/Medium | Add explicit `allowedDevOrigins` policy if needed by tooling |
| Mode inconsistency risk | mix of mode in query vs local preference toggles | Conflicting UX labels/behavior | High | Single source of truth mode context service |
| Demo/live confusion | Live labels with synthetic mapped content | Trust erosion | High | Add per-surface provenance badges + data coverage meter |
| Duplicate navigation logic | Multiple raw `router.push` strings | Context loss and regressions | High | Centralize route builder, ban raw pushes via lint rule |
| API redundancy | `/api/today` and `/api/bettor-data` divergent projections | Drift and inconsistency | Medium | Shared projection layer with typed contracts |
| State duplication board/gateway | `boardService` + `gateway` remap static fields | Inconsistent realism by route | High | Consolidate bettor-ready projection in board service or shared transformer |
| Silent fallback risk | catch blocks degrade quietly | Hidden live failures | Medium/High | Emit mandatory degraded events + surface user-visible degradation reasons |
| Journey test fragility | Playwright unavailable in audit run | Continuity regressions can ship | Medium | CI browser runtime hard requirement with artifact retention |

---

## Workflow Replacement Score
**5.5 / 10**

## Nervous System Cohesion Score
**4.0 / 10**

## IP Strength Score
**5.0 / 10**

---

## Top 5 Strategic Gaps
1. Context spine is optional in practice, not mandatory by architecture.
2. Slip and live surfaces remain partially detached from unified board truth.
3. Data richness (players, odds depth, logs) is below serious bettor replacement threshold.
4. Telemetry exists but is not yet tightly coupled to bettor ROI decisions.
5. Agent/orchestration story is more framing than hard differentiated runtime capability.

## Top 5 Immediate Refactors
1. Enforce `toHref`/route-builder only navigation with lint + codemod.
2. Replace `/slip` hardcoded fixtures with `getBoardData`/`getBettorData` feed.
3. Canonicalize trace parameter naming across all routes/APIs (`trace_id`).
4. Add provenance and coverage badges per card (live/fallback + source completeness).
5. Split gateway into true orchestration stages (fetch, enrich, rank, explain) with tests.

---

## 30-Day Execution Plan

### Week 1 — Continuity hardening
- Route contract RFC: canonical query keys and navigation helper.
- Refactor top CTA leaks (landing/today/slip/ingest/control).
- Add regression tests for context persistence on each transition.

### Week 2 — Data realism upgrade
- Replace static `/slip` data source with board/gateway projection.
- Add provider-backed active players + last-5 stats fields to board envelope.
- Add multi-book odds spread fields and UI slots.

### Week 3 — Orchestration and telemetry
- Refactor `gateway.server.ts` into explicit orchestrator steps.
- Add actionable telemetry KPIs (coverage %, fallback frequency, confidence cap reason).
- Upgrade `/api/provider-health` with per-provider latency/error breakdown.

### Week 4 — Workflow replacement proof
- Re-run and stabilize journey suite with browser runtime in CI.
- Add “manual workflow replacement checklist” acceptance test.
- Publish measurable before/during/after loop metrics dashboard.

---

## Brutally Honest Verdict
This is **becoming real infrastructure**, but the product still has elements of **architecture theater** where continuity and realism claims exceed current end-user truth.

If you force context continuity, remove static slip/live detours, and raise board data density in the next 30 days, this can cross into real bettor workflow replacement territory. Without that, it remains an impressive demoable system with incomplete replacement power.
