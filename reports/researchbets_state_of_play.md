# ResearchBets State of Play

## 1. Executive Summary
- ResearchBets is a Next.js App Router betting workflow product centered on a canonical bettor loop: board/today scan, slip building, stress-test analysis, tracking, and postmortem review (`README.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`).
- The repo appears to be at **Functional MVP / early Near-Ship MVP** stage: the core product loop exists, but multiple surfaces are still demo-backed, partially simulated, or duplicated (`src/core/today/service.server.ts`, `src/core/pipeline/runSlip.ts`, `app/(product)/control/ControlPageClient.tsx`).
- It is **demoable and internally usable**, but not yet fully trustworthy as a live bettor replacement because several “during/live” and ingestion/review workflows still rely on deterministic mocks or local/session storage (`app/(product)/control/ControlPageClient.tsx`, `app/(product)/track/TrackPageClient.tsx`, `src/core/slips/draftSlipStore.ts`).
- Biggest blockers: continuity still depends heavily on query params and browser storage, product/docs drift remains high, and some persistence/security posture is clearly marked as MVP/permissive (`docs/COCKPIT_CANONICAL_ENTRY.md`, `README.md`, `supabase/migrations/20260301090000_run_events_table.sql`).
- Biggest strengths: the repo has a real deterministic domain core, strong fallback semantics, extensive tests, a clear provider abstraction, and explicit runtime truth contracts (`src/core/today/service.server.ts`, `src/core/slips/slipIntelligence.ts`, `src/core/control-plane/events.ts`, `.github/workflows/ci.yml`).
- Recent momentum is converging around the canonical bettor workflow and cockpit/board continuity, not random experimentation: the last ~30 commits mostly touch cockpit landing, board evidence, continuity, diagnostics, and today/runtime coherence (`git log --oneline -n 30`, `git diff --name-only HEAD~20..HEAD`).
- Progress likely feels stuck because the repo keeps adding polish, route aliases, and proof surfaces while still carrying older dashboard/terminal/product concepts in parallel (`docs/audits/state-of-union-everyday-bettor-os.md`, `docs/audits/technical-diligence-2026-02-26.md`, `src/components/terminal/*`, `app/(product)/discover/page.tsx`).

## 2. Repository Snapshot

### Top-level directory summary
- `app/`: Next.js App Router pages and API routes; canonical product routes live under `app/(product)` plus `/` and `/cockpit`.
- `src/`: main product code, including components, domain logic, persistence, providers, routing helpers, and shared contracts.
- `docs/`: extensive product, architecture, audit, and release notes.
- `supabase/` and `db/`: database schema and migrations; both exist, which is itself notable drift.
- `tests/`, `app/**/__tests__`, `src/**/__tests__`: broad unit/integration coverage.
- `scripts/`: governance/audit scripts, env checks, schema checks, and route/report generation.
- `services/`, `packages/`, `features/`: supporting service packages, schemas, and alternate/legacy feature modules.

### Important apps / pages / routes / modules
- Canonical landing: `app/page.tsx` -> `app/_components/CanonicalLanding.tsx` -> `app/cockpit/CockpitLandingClient.tsx`
- Board/today: `app/(product)/today/page.tsx`, `src/components/today/TodayPageClient.tsx`
- Slip builder: `app/(product)/slip/page.tsx`, `app/(product)/slip/SlipPageClient.tsx`
- Stress test: `app/(product)/stress-test/page.tsx`, `src/components/research/ResearchPageContent.tsx`
- Control/review: `app/(product)/control/page.tsx`, `app/(product)/control/ControlPageClient.tsx`
- Tracking: `app/(product)/track/page.tsx`, `app/(product)/track/TrackPageClient.tsx`
- Key APIs: `app/api/today/route.ts`, `app/api/events/route.ts`, `app/api/postmortem/route.ts`, `app/api/slips/*`, `app/api/run/stress-test/route.ts`
- Core engines: `src/core/today/service.server.ts`, `src/core/pipeline/runSlip.ts`, `src/core/slips/slipIntelligence.ts`, `src/core/slate/*`, `src/core/persistence/*`

### Notable docs
- High-level front door: `README.md`
- Product truth: `docs/PRODUCT.md`, `docs/product/vision.md`, `docs/product/ux-map.md`
- Architecture: `docs/ARCHITECTURE.md`, `docs/APIS.md`, `docs/ROUTES.md`
- Release/ops: `docs/RELEASE.md`, `docs/SETUP.md`, `docs/TROUBLESHOOTING.md`
- Internal audits: `docs/audit/REPO_STATE.md`, `docs/audit/bettor-loop-map.md`, `docs/audit/prioritized-backlog.md`, `docs/audits/state-of-union-everyday-bettor-os.md`, `docs/audits/technical-diligence-2026-02-26.md`
- Active PR planning: `docs/PR_PLAN.md`

### Notable infra / deployment files
- Package/scripts: `package.json`
- Vercel deploy: `vercel.json`
- App config: `next.config.mjs`, `tsconfig.json`
- CI: `.github/workflows/ci.yml`
- Supabase schema/migrations: `supabase/schema.sql`, `supabase/migrations/*`, `db/supabase/schema.sql`

## 3. Product Reality vs Product Intent

| Intended / described product | Actually implemented product |
|---|---|
| A bettor cockpit that runs a full loop: board -> slip -> stress test -> live posture -> postmortem (`README.md`, `docs/PRODUCT.md`) | That full route set exists and is navigable, but some steps remain partially simulated or local-only, especially live/review ingestion and tracking continuity (`app/(product)/control/ControlPageClient.tsx`, `app/(product)/track/TrackPageClient.tsx`). |
| Canonical entry is `/`, with `/cockpit` as alias (`README.md`) | Implementation supports `/` and `/cockpit` sharing the same landing via `CanonicalLanding`, but `docs/COCKPIT_CANONICAL_ENTRY.md` still describes `/cockpit` as canonical and says `/` redirects, which no longer matches `app/page.tsx` and `app/cockpit/page.tsx`. |
| Live/cache/demo runtime truth should be explicit and safe (`README.md`, `AGENTS.md`) | This is genuinely implemented in today flow and exposed through payload mode/provenance plus fallback behavior (`app/api/today/route.ts`, `src/core/today/service.server.ts`). |
| Demo mode should remain deterministic and usable without providers (`README.md`, `AGENTS.md`, `docs/SETUP.md`) | This is a real strength: deterministic demo payloads and demo-safe paths exist across board, research, track, and postmortem (`src/core/today/demoToday.ts`, `src/components/research/ResearchPageContent.tsx`, `src/core/slips/demoSlipTracker.ts`). |
| Product should feel like a tight bettor workflow rather than a tooling console (`docs/product/vision.md`) | The top surfaces are much closer to that goal, but the repo still contains active legacy/dashboard/terminal surfaces and aliases that dilute focus (`src/components/terminal/*`, `app/(product)/discover/page.tsx`, `app/(product)/research/page.tsx`, `docs/audits/state-of-union-everyday-bettor-os.md`). |
| Stress test should explain weak points before placement (`docs/PRODUCT.md`) | Implemented credibly: `runSlip`, verdict logic, weakest-leg ranking, copy/share flows, and `SlipIntelBar` all support this (`src/core/pipeline/runSlip.ts`, `src/components/research/AnalyzeTabPanel.tsx`, `src/core/slips/slipIntelligence.ts`). |
| Control/review should turn outcomes into learning (`docs/PRODUCT.md`) | Partially true: deterministic postmortem classification exists, but review input still uses filename-based mock OCR behavior in the main client (`app/(product)/control/ControlPageClient.tsx`, `app/api/postmortem/route.ts`). |
| Tracking/live posture should be part of the canonical loop (`docs/ARCHITECTURE.md`) | Tracking exists and is coherent in demo mode, but it is still local/demo-oriented rather than a true live operations surface (`app/(product)/track/TrackPageClient.tsx`, `src/core/slips/demoSlipTracker.ts`). |

## 4. What Is Already Built

### User-facing UI
- **Canonical landing / cockpit**  
  What exists: shared landing composition with board signals, ticket staging, workflow framing, sport/mode switching, and continuity CTAs.  
  Key files: `app/page.tsx`, `app/_components/CanonicalLanding.tsx`, `app/cockpit/CockpitLandingClient.tsx`, `src/components/cockpit/CockpitHeader.tsx`  
  Confidence: **High**
- **Today / board surface**  
  What exists: board filters, grouped/all views, top spots, staged-leg drawer, runtime truth header, and board evidence cues.  
  Key files: `app/(product)/today/page.tsx`, `src/components/today/TodayPageClient.tsx`, `src/components/today/BoardTerminalTable.tsx`, `src/components/today/SlipDrawer.tsx`  
  Confidence: **High**
- **Slip builder / staging**  
  What exists: slip drafting, sample paths, real-time slip intelligence, and board-to-slip handoff.  
  Key files: `app/(product)/slip/page.tsx`, `app/(product)/slip/SlipPageClient.tsx`, `src/hooks/useDraftSlip.ts`, `src/components/slips/SlipIntelBar.tsx`  
  Confidence: **Medium** (full page implementation was not exhaustively reviewed, but supporting modules are substantial)
- **Stress-test / research workspace**  
  What exists: analyze/scout/live tabs, run replay, demo auto-run, weakest-leg logic, calibration strip, share/copy flows.  
  Key files: `app/(product)/stress-test/page.tsx`, `src/components/research/ResearchPageContent.tsx`, `src/components/research/AnalyzeTabPanel.tsx`  
  Confidence: **High**
- **Control/review surface**  
  What exists: live vs review tabs, sample review, postmortem panel, latest-run handoff.  
  Key files: `app/(product)/control/page.tsx`, `app/(product)/control/ControlPageClient.tsx`, `app/(product)/control/ReviewPanel.tsx`  
  Confidence: **Medium** (UI exists, but production realism is partial)
- **Track / during surface**  
  What exists: tracked slip hydration, demo tracking progression, leg progress bars, journal save flow, open ticket panel, continuity messaging.  
  Key files: `app/(product)/track/page.tsx`, `app/(product)/track/TrackPageClient.tsx`, `src/components/track/OpenTicketsPanel.tsx`, `src/components/track/DuringStageTracker.tsx`  
  Confidence: **High**

### Core analysis / decision engine
- **Today aggregation + fallback engine**  
  What exists: live provider fetch, cache fallback, deterministic demo payload, diagnostics taxonomy, board construction.  
  Key files: `src/core/today/service.server.ts`, `src/core/today/demoToday.ts`, `app/api/today/route.ts`  
  Confidence: **High**
- **Slip intelligence engine**  
  What exists: correlation, fragility, volatility, weakest leg, structure report generation.  
  Key files: `src/core/slips/slipIntelligence.ts`, `src/core/slips/slipRiskSummary.ts`  
  Confidence: **High**
- **Stress-test pipeline**  
  What exists: slip submit/extract, enrichment, scoring, verdict generation, persistence, pipeline events.  
  Key files: `src/core/pipeline/runSlip.ts`, `app/api/slips/submit/route.ts`, `app/api/slips/extract/route.ts`, `src/core/run/store.ts`  
  Confidence: **High**
- **Postmortem classifier**  
  What exists: deterministic postmortem report and attribution using structure report heuristics.  
  Key files: `app/api/postmortem/route.ts`  
  Confidence: **High**
- **Slate / tonight intelligence**  
  What exists: slate summary, lead generation, reactive window logic, ranked leads for tonight and tracking sample generation.  
  Key files: `src/core/slate/slateEngine.ts`, `src/core/slate/leadEngine.ts`, `src/core/slate/reactiveWindow.ts`, `app/(product)/tonight/TonightPageClient.tsx`  
  Confidence: **Medium**

### Data / logging / storage
- **Runtime store abstraction**  
  What exists: pluggable memory vs Supabase runtime store provider.  
  Key files: `src/core/persistence/runtimeStoreProvider.ts`, `src/core/persistence/supabaseRuntimeStore.ts`, `src/core/persistence/runtimeDb.ts`  
  Confidence: **High**
- **Control-plane telemetry**  
  What exists: typed events, API for emit/list, DB-backed emitter.  
  Key files: `src/core/control-plane/events.ts`, `src/core/control-plane/emitter.ts`, `app/api/events/route.ts`  
  Confidence: **High**
- **Local-first draft / tracking / journal storage**  
  What exists: draft slip store, tracked slip storage, journal persistence in browser.  
  Key files: `src/core/slips/draftSlipStore.ts`, `src/core/slips/storage.ts`, `src/core/journal/storage.ts`  
  Confidence: **High**
- **Supabase schema and migrations**  
  What exists: broad schema covering profiles, slips, events, outcomes, cache, and analytics.  
  Key files: `supabase/schema.sql`, `supabase/migrations/*`, `db/supabase/schema.sql`  
  Confidence: **High**

### Deployment / CI/CD
- **Vercel deployment config**  
  What exists: Vercel cron for `/api/today/warm`, function duration control.  
  Key files: `vercel.json`, `app/api/today/warm/route.ts`  
  Confidence: **High**
- **Quality gates and governance scripts**  
  What exists: lint/type/test/build gates plus route, security, docs, schema-drift, governor, unused-code audits.  
  Key files: `package.json`, `scripts/*`, `.github/workflows/ci.yml`  
  Confidence: **High**

### Testing / observability
- **Large test surface**  
  What exists: route tests, domain tests, UI tests, continuity tests, journey/playwright tests.  
  Key files: `tests/*`, `src/**/__tests__`, `app/**/__tests__`  
  Confidence: **High**
- **Observability / audit artifacts**  
  What exists: repo audits, journey reports, CTA graph, route manifests, RIA artifacts.  
  Key files: `docs/JOURNEY_REPORT.md`, `docs/CTA_GRAPH.md`, `docs/audits/routes.manifest.md`, `docs/ria/*`  
  Confidence: **High**

## 5. Core User Workflow Audit

### Likely bettor workflow reconstructed from repo
1. **Landing / cockpit**: user enters at `/` or `/cockpit`, sees board-led proof and ticket staging (`app/page.tsx`, `app/cockpit/CockpitLandingClient.tsx`).
2. **Board / today**: user scans top spots, filters slate, stages 2–3 legs (`app/(product)/today/page.tsx`, `src/components/today/TodayPageClient.tsx`).
3. **Slip / staging**: user refines draft and gets immediate correlation/fragility signals (`app/(product)/slip/page.tsx`, `src/components/slips/SlipIntelBar.tsx`).
4. **Analysis / stress-test**: user runs `runSlip`, sees verdict, weakest leg, reasons, and supporting details (`src/components/research/ResearchPageContent.tsx`, `src/components/research/AnalyzeTabPanel.tsx`).
5. **Tracking / during**: user continues run in `/track`, watches leg progression, keeps learning even after elimination (`app/(product)/track/TrackPageClient.tsx`).
6. **Review / after**: user opens `/control?tab=review`, uploads or samples a slip, receives deterministic postmortem and suggested learning paths (`app/(product)/control/ControlPageClient.tsx`, `app/api/postmortem/route.ts`).

### What parts are implemented
- Landing/cockpit framing is implemented and actively maintained.
- Board/today flow is implemented with meaningful data contracts and fallback semantics.
- Slip intelligence and stress-test verdict generation are implemented.
- Track/journal/postmortem loop exists in usable form.
- Telemetry and trace continuity infrastructure exist.

### What parts are partial
- Review ingestion is partial because main review UI still uses `mockParseSlip(fileName)` before running the pipeline (`app/(product)/control/ControlPageClient.tsx`).
- Track/live posture is partial because it is mostly demo/local progression rather than provider-fed live updates (`app/(product)/track/TrackPageClient.tsx`, `src/core/slips/demoSlipTracker.ts`).
- Identity/persistence is partial because browser storage remains central to the main flow even though Supabase persistence exists.
- Community/profile/history routes exist in repo, but they were not evidenced as core shipped workflow drivers and several audits describe them as incomplete or placeholder-backed (`docs/audits/state-of-union-everyday-bettor-os.md`).

### What parts are missing
- A fully trustworthy live in-game operations surface backed by real state changes.
- Early canonical slip/run identity before analysis; audits still call out late `trace_id` and session-only draft continuity (`docs/audit/bettor-loop-map.md`).
- Clear pruning of non-canonical/legacy surfaces, which still compete with the main bettor path.

## 6. Architecture Summary

### Main frontend architecture
- Next.js 14 App Router app with server route wrappers and client-heavy product surfaces (`app/*`, `app/(product)/*`).
- Canonical landing and cockpit share composition through `CanonicalLanding`; route aliases redirect or map into canonical surfaces (`app/page.tsx`, `app/cockpit/page.tsx`, `app/landing/page.tsx`, `app/(product)/slips/new/page.tsx`).
- UI is componentized across `src/components/*`, but styling discipline is mixed: there are primitives plus many direct Tailwind-heavy components (`docs/audits/state-of-union-everyday-bettor-os.md`).

### Backend / API architecture
- App Router route handlers under `app/api/*` serve today data, slip submission/extraction, event stream, postmortem, metrics, provider health, and other product APIs.
- The backend leans on deterministic domain modules under `src/core/*`, especially today aggregation, pipeline execution, persistence, routing, telemetry, and truth-presentation helpers.
- Provider access is kept server-side and abstracted behind registry/provider modules (`src/core/today/service.server.ts`, `src/core/providers/*`).

### Data / storage model
- Browser/session/local storage covers drafts, tracked slips, and journal continuity for demo-safe UX (`src/core/slips/draftSlipStore.ts`, `src/core/slips/storage.ts`, `src/core/journal/storage.ts`).
- Runtime persistence abstracts to memory in tests and Supabase in production/default dev unless overridden (`src/core/persistence/runtimeStoreProvider.ts`).
- Supabase schema spans runtime sessions, analytics events, bets, slips, outcomes, cache, and user-facing tables (`supabase/schema.sql`, `supabase/migrations/*`).

### Spine / shared context model
- A “truth spine” / “nervous system” carries `sport`, `tz`, `date`, `mode`, `trace_id`, and related query state (`README.md`, `docs/ROUTES.md`, `src/core/nervous/spine.ts`, `src/components/nervous/NervousSystemContext.tsx`).
- Navigation helpers (`toHref`, `spineHref`, related helpers) are intended to preserve context across route transitions.
- In practice, continuity is improved but still not absolute; the audits continue to flag drift and late identity issuance (`docs/audit/bettor-loop-map.md`, `docs/PR_PLAN.md`).

### Mode handling (live / demo / fallback)
- `app/api/today/route.ts` resolves request intent, provider health, and runtime mode, then returns aligned payloads with explicit provenance and optional debug.
- `src/core/today/service.server.ts` implements live-first fetch, cache fallback, and deterministic demo fallback.
- UI headers and summaries consume these mode/provenance signals rather than inventing local truth (`src/components/today/TodayPageClient.tsx`, `src/core/ui/truthPresentation.ts`).

### Trace / logging model
- Trace context is derived centrally and preserved through API and UI paths (`src/core/trace/getTraceContext.server.ts`, `src/core/trace/queryTrace.ts`).
- Control-plane events are typed and persisted via `DbEventEmitter` and runtime store (`app/api/events/route.ts`, `src/core/control-plane/events.ts`, `src/core/control-plane/emitter.ts`).
- Stress-test pipeline explicitly emits milestone events (`src/core/pipeline/runSlip.ts`).

## 7. Current Gaps and Risks

### Product risks
- **Docs and product truth are drifting across multiple “canonical” narratives.** `README.md` says `/` is canonical with `/cockpit` as alias, while `docs/COCKPIT_CANONICAL_ENTRY.md` still says `/cockpit` is canonical and `/` redirects. That kind of front-door drift makes it harder to know what the actual product promise is and increases team churn around routing and onboarding.

:::task-stub{title="Reconcile canonical entry docs and route truth"}
Update the canonical-entry documentation set so README, docs/COCKPIT_CANONICAL_ENTRY.md, docs/ROUTES.md, and any landing-routing docs all describe the same current behavior.

Use app/page.tsx, app/cockpit/page.tsx, and app/landing/page.tsx as implementation truth. Remove or rewrite statements that say `/` redirects to `/cockpit` if that is no longer true.

Add a lightweight docs consistency check or extend scripts/docs-check.mjs so future route-canonical drift is caught automatically.
:::

- **The repo still carries multiple product identities at once.** Current momentum is bettor-loop/cockpit focused, but active discover/research/dashboard/terminal surfaces remain in code and docs (`app/(product)/discover/page.tsx`, `src/components/terminal/*`, `docs/audits/state-of-union-everyday-bettor-os.md`). This creates surface-area drift and makes the product feel broader than the actually shippable loop.

:::task-stub{title="Deprecate or isolate non-canonical bettor surfaces"}
Inventory active routes and components that are not part of the current canonical loop: `/discover`, `/research`, `/dashboard`, terminal trace surfaces, and any landing-era alternates.

For each, choose one of three actions: redirect to a canonical route, move behind a dev-only/admin-only boundary, or mark as deprecated and block new imports.

Start with app/(product)/discover/page.tsx, app/(product)/research/page.tsx, src/components/terminal/, and related nav/CTA entry points. Update docs/ROUTES.md and README to reflect the reduced public surface.
:::

- **The live/during value proposition is ahead of the implementation.** `/track` is coherent, but its core progression is demo-driven and local; `/control?tab=live` still reads more like a placeholder status shell than a true live operations view (`app/(product)/track/TrackPageClient.tsx`, `app/(product)/control/ControlPageClient.tsx`).

:::task-stub{title="Turn tracking and live posture into a real provider-backed surface"}
Define the minimum real-time data contract needed for the DURING stage: slip status, leg progress, elimination state, and key live context deltas.

Replace the main demo-driven progression path in src/core/slips/demoSlipTracker.ts and app/(product)/track/TrackPageClient.tsx with a provider-backed or persisted event-backed read model where available, while keeping demo mode as an explicit fallback.

Upgrade app/(product)/control/ControlPageClient.tsx live tab to consume the same read model so `/track` and `/control?tab=live` stop diverging.
:::

### Engineering risks
- **Continuity still depends heavily on browser/session storage and late trace issuance.** Audits already call out that draft composition is session-backed and `trace_id` appears late in the flow (`docs/audit/bettor-loop-map.md`, `src/core/slips/draftSlipStore.ts`, `src/components/research/ResearchPageContent.tsx`). This weakens replayability, deep linking, and trust in the run lifecycle.

:::task-stub{title="Issue canonical slip and trace identity earlier in the bettor flow"}
Introduce early stable identifiers when the first board leg is staged or a slip draft is created.

Use docs/audit/bettor-loop-map.md and docs/PR_PLAN.md as guidance, then update src/core/slips/draftSlipStore.ts, src/hooks/useDraftSlip.ts, src/components/today/SlipDrawer.tsx, and the handoff into src/components/research/ResearchPageContent.tsx so draft state is associated with a canonical slip_id and trace_id before run execution.

Add tests around board -> slip -> stress-test continuity and ensure query-spine helpers continue to preserve the same identifiers.
:::

- **Review ingestion is not yet production-grade.** The main control/review client uses `mockParseSlip(fileName)` and deterministic sample strings before calling the postmortem flow (`app/(product)/control/ControlPageClient.tsx`). That is fine for demos, but it means the visible review UX overstates ingestion maturity.

:::task-stub{title="Replace mock review ingestion with the real slip parsing pipeline"}
Remove the filename-based mockParseSlip path from app/(product)/control/ControlPageClient.tsx for the main review flow.

Route uploaded slips through the same parsing/extraction path used elsewhere, reusing app/api/slips/parseText/route.ts, app/api/slips/extract/route.ts, or a shared ingestion helper as appropriate.

Keep a clearly labeled demo sample action for fallback/testing, but separate it from the default upload path so live review truth matches implementation reality.
:::

- **There are two schema baselines.** Both `supabase/schema.sql` and `db/supabase/schema.sql` exist, and prior audits already call this out as drift risk (`docs/audits/state-of-union-everyday-bettor-os.md`). That creates operational ambiguity around which schema is authoritative.

:::task-stub{title="Collapse to one authoritative database schema baseline"}
Decide whether `supabase/schema.sql` or `db/supabase/schema.sql` is the canonical schema snapshot.

Remove or clearly archive the redundant baseline, then update scripts/check-schema-drift.mjs, docs/ARCHITECTURE.md, docs/SETUP.md, and any CI/schema-check scripts so only one schema source of truth is used.

Verify that migration generation/reset workflows reference the same baseline everywhere.
:::

### Operational risks
- **Persistence/security posture is still explicitly permissive in at least one runtime table.** `supabase/migrations/20260301090000_run_events_table.sql` includes a comment saying policies are MVP-permissive and should be tightened. For a telemetry-heavy product, this is a real operational concern.

:::task-stub{title="Tighten run event access policies before broader deployment"}
Review Supabase policies for `public.run_events` and related telemetry/runtime tables used by events and trace flows.

Starting with supabase/migrations/20260301090000_run_events_table.sql, replace MVP-permissive policies with authenticated owner or trace-scoped rules that match the intended product access model.

Add tests or migration verification checks so permissive telemetry policies cannot regress silently.
:::

- **Production defaults lean toward Supabase, but the primary loop still depends on local-first state.** `runtimeStoreProvider` chooses Supabase outside tests unless explicitly overridden, yet drafts/tracking/journal are still mostly browser-local (`src/core/persistence/runtimeStoreProvider.ts`, `src/core/slips/storage.ts`, `src/core/journal/storage.ts`). This split can make environments behave differently in subtle ways.

:::task-stub{title="Define and document one persistence contract for the canonical loop"}
Document which parts of the canonical bettor workflow are expected to persist locally only, which persist to Supabase, and how the app should degrade when Supabase is absent.

Use src/core/persistence/runtimeStoreProvider.ts, src/core/slips/storage.ts, src/core/journal/storage.ts, and relevant routes/APIs to produce a clear persistence matrix in docs/ARCHITECTURE.md and docs/SETUP.md.

Then add guardrails/tests so product-critical state does not silently split across incompatible stores without visible UX messaging.
:::

### UX risks
- **There is still too much parallel navigation and too many near-duplicate entry points.** Even with canonical `/`, the repo keeps aliases like `/landing`, `/discover`, `/research`, `/live`, and `/slips/new`, plus older docs still reference different flows (`README.md`, `docs/ROUTES.md`, `app/landing/page.tsx`, `app/(product)/slips/new/page.tsx`). That raises user confusion and internal maintenance cost.

:::task-stub{title="Reduce route alias sprawl around the canonical bettor journey"}
Audit all public and compatibility routes, then classify each as canonical, redirect-only compatibility, or dev-only.

Use README.md, docs/ROUTES.md, app/landing/page.tsx, app/(product)/slips/new/page.tsx, and the route inventory in docs/audits/routes.manifest.md as the starting point.

Remove unnecessary public-facing aliases from navigation/CTAs, keep redirects only where backward compatibility is required, and make the canonical bettor journey obvious in headers and primary buttons.
:::

- **The stress-test experience is strong, but the workflow state is still more implicit than explicit.** Audits repeatedly note that the backend event/run infrastructure is richer than the bettor-facing stage/status UI (`docs/audit/bettor-loop-map.md`). That means the user may not fully understand where they are in the process even though the system does.

:::task-stub{title="Expose bettor-facing run progress from existing pipeline events"}
Use the event stages already emitted in src/core/pipeline/runSlip.ts and served by app/api/events/route.ts to build a simple visible run-progress strip in the stress-test surface.

Start in src/components/research/ResearchPageContent.tsx and src/components/research/AnalyzeTabPanel.tsx, showing ingest, extract, enrich, score, and verdict milestones in bettor-language.

Keep the presentation lightweight and deterministic, but make stage progression visible without requiring trace or developer pages.
:::

## 8. Shipping Assessment
- **Is this repo currently shippable?** Yes, as an **internal or limited-access MVP**. No, as a broadly trusted public live-data betting product.
- **If yes, what version?** A credible `v0.2.x`-style internal beta / design-partner MVP, which matches the repo’s own `package.json` version (`0.2.0`).
- **If no, what are the minimum missing pieces?** For a broader external ship: real review ingestion, tighter persistence/security posture, reduced route/doc drift, and a more truthful live/during surface.

**Maturity label: Functional MVP**

Why:
- The core bettor loop is real and integrated enough to demo and use internally.
- Deterministic fallback behavior is unusually well-developed.
- The repo has strong tests and CI discipline.
- But too many user-visible flows still rely on demo/local/mocked behavior to call it Near-Ship or Public Beta Ready with confidence.

## 9. Recommended Next Steps

### Next 3 highest-leverage actions
1. **Finish the real bettor loop before widening the surface area.** Replace review mock ingestion, make tracking/live posture more truthful, and issue stable slip/trace identity earlier.
2. **Collapse drift.** Reconcile canonical docs/routes and isolate non-canonical surfaces so the team stops shipping across multiple product narratives.
3. **Harden the operational baseline.** Tighten permissive event/table policies and clarify the persistence contract between local-first UX and Supabase-backed runtime state.

### Next 7-day shipping plan
- **Day 1-2:** reconcile canonical route/docs truth and remove or demote non-canonical CTAs.
- **Day 2-4:** replace the default review upload path with the real parsing pipeline; keep demo sample as an explicit fallback.
- **Day 3-5:** add early `slip_id` / `trace_id` issuance on first draft action and wire it through board -> slip -> stress-test.
- **Day 5-6:** expose a bettor-facing run progress strip using existing events.
- **Day 6-7:** tighten `run_events` / telemetry table policies and update architecture/setup docs around persistence.

### What to postpone or cut
- New adjacent surfaces that are not part of the canonical bettor loop.
- Further landing polish beyond what is required to clarify the main path.
- Broader community/social expansion until the core before/during/after workflow is fully trustworthy.
- Additional “AI” labeling or agent taxonomy work unless it directly improves the bettor workflow.

### What to measure immediately
- Board -> slip -> stress-test conversion rate.
- Percentage of runs using demo/cache/live mode by surface.
- Frequency of fallback reasons on `/api/today`.
- Percentage of stress-test runs with a preserved `trace_id` from board/staging.
- Review completion rate from upload to postmortem output.
- Tracking adoption and journal-save rate after ticket elimination/settlement.

## 10. Appendix

### Key files reviewed
- `AGENTS.md`
- `README.md`
- `package.json`
- `vercel.json`
- `next.config.mjs`
- `.github/workflows/ci.yml`
- `docs/ARCHITECTURE.md`
- `docs/PRODUCT.md`
- `docs/ROUTES.md`
- `docs/SETUP.md`
- `docs/TROUBLESHOOTING.md`
- `docs/PR_PLAN.md`
- `docs/COCKPIT_CANONICAL_ENTRY.md`
- `docs/product/vision.md`
- `docs/product/ux-map.md`
- `docs/audit/REPO_STATE.md`
- `docs/audit/bettor-loop-map.md`
- `docs/audit/prioritized-backlog.md`
- `docs/audits/state-of-union-everyday-bettor-os.md`
- `docs/audits/technical-diligence-2026-02-26.md`
- `app/page.tsx`
- `app/_components/CanonicalLanding.tsx`
- `app/cockpit/page.tsx`
- `app/cockpit/CockpitLandingClient.tsx`
- `app/(product)/today/page.tsx`
- `src/components/today/TodayPageClient.tsx`
- `src/components/today/BoardTerminalTable.tsx`
- `src/components/today/SlipDrawer.tsx`
- `app/(product)/slip/page.tsx`
- `app/(product)/stress-test/page.tsx`
- `src/components/research/ResearchPageContent.tsx`
- `src/components/research/AnalyzeTabPanel.tsx`
- `app/(product)/control/page.tsx`
- `app/(product)/control/ControlPageClient.tsx`
- `app/(product)/track/page.tsx`
- `app/(product)/track/TrackPageClient.tsx`
- `app/api/today/route.ts`
- `app/api/events/route.ts`
- `app/api/postmortem/route.ts`
- `src/core/today/service.server.ts`
- `src/core/today/demoToday.ts`
- `src/core/pipeline/runSlip.ts`
- `src/core/slips/slipIntelligence.ts`
- `src/core/persistence/runtimeStoreProvider.ts`
- `src/core/persistence/supabaseRuntimeStore.ts`
- `supabase/schema.sql`
- `db/supabase/schema.sql`
- `supabase/migrations/20260301090000_run_events_table.sql`
- `git log --oneline -n 30`
- `git diff --name-only HEAD~20..HEAD`

### Recent momentum audit
- Recent commit themes are tightly clustered around cockpit landing composition, board evidence quality, continuity, diagnostics/runtime coherence, and today cache/runtime behavior.
- The last 30 commits show repeated changes like: cockpit landing refocus, board row evidence/actions, runtime reason sanitization, continuity across board/analyze/track, and warm/cache fixes.
- Diff clustering across the last ~20 commits is concentrated in `app/cockpit/*`, `src/components/today/*`, `src/components/research/*`, `src/core/today/*`, `src/core/run/*`, `src/core/trace/*`, and related tests.
- This suggests the repo is **converging** on a canonical bettor loop rather than drifting randomly.
- The probable reason progress still feels stuck is not lack of work; it is that convergence is happening while legacy surfaces, route aliases, and older product narratives are still present, so visible simplification lags behind actual code effort.

### Unresolved questions
- How much of the live provider stack is fully working end-to-end in production today versus only in provider-aware architecture paths?
- Which of the non-canonical product routes are intentionally still public versus left over for compatibility/internal use?
- Which DB schema file is intended to be authoritative going forward?
- How much real user data/backfill exists for calibration and postmortem loops outside demo flows?

### Assumptions made
- I treated implementation files in `app/` and `src/` as source of truth when docs conflicted.
- I did not run tests, the app, or any setup scripts; this report is based on static inspection only.
- I inferred shipping maturity from route/code completeness, docs, CI, and recent commits, not from runtime verification.
