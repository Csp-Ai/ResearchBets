# ResearchBets File Map

## Docs
- `README.md` - front-door project summary and canonical route/mode claims
- `AGENTS.md` - intelligence module rules and repo operating guidance
- `docs/ARCHITECTURE.md` - system architecture and route/data flow summary
- `docs/PRODUCT.md` - target users, promises, and 2-minute demo flow
- `docs/ROUTES.md` - canonical route map and truth spine contract
- `docs/SETUP.md` - local/demo/live setup and env expectations
- `docs/TROUBLESHOOTING.md` - mode precedence and provider troubleshooting
- `docs/RELEASE.md` - release checklist and deployment truth
- `docs/PR_PLAN.md` - prioritized implementation backlog
- `docs/COCKPIT_CANONICAL_ENTRY.md` - older canonical-entry document, currently drift-prone
- `docs/product/vision.md` - bettor-app vision statement
- `docs/product/ux-map.md` - intended route and interaction map
- `docs/audit/REPO_STATE.md` - recent repo-state summary
- `docs/audit/bettor-loop-map.md` - route/state audit of the bettor loop
- `docs/audit/prioritized-backlog.md` - next-PR backlog
- `docs/audits/state-of-union-everyday-bettor-os.md` - architecture/product alignment audit
- `docs/audits/technical-diligence-2026-02-26.md` - detailed workflow/continuity/realism audit

## Pages
- `app/page.tsx` - canonical landing entry
- `app/cockpit/page.tsx` - cockpit alias entry
- `app/landing/page.tsx` - redirect to canonical landing
- `app/(product)/today/page.tsx` - board page
- `app/(product)/slip/page.tsx` - slip page wrapper
- `app/(product)/stress-test/page.tsx` - stress-test page wrapper
- `app/(product)/control/page.tsx` - control/review page wrapper
- `app/(product)/track/page.tsx` - tracking page wrapper
- `app/(product)/discover/page.tsx` - non-canonical discover surface
- `app/(product)/research/page.tsx` - non-canonical research alias/surface
- `app/(product)/live/page.tsx` - live alias surface
- `app/(product)/tonight/page.tsx` - tonight lead surface
- `app/(product)/slips/new/page.tsx` - redirect to canonical `/slip`

## Components
- `app/_components/CanonicalLanding.tsx` - landing wrapper with nervous-system context
- `app/cockpit/CockpitLandingClient.tsx` - main cockpit/landing client
- `src/components/cockpit/CockpitHeader.tsx` - shared header surface
- `src/components/cockpit/CockpitShell.tsx` - shell for core product pages
- `src/components/today/TodayPageClient.tsx` - board client
- `src/components/today/BoardTerminalTable.tsx` - ranked board rows
- `src/components/today/SlipDrawer.tsx` - staged ticket drawer
- `src/components/today/TopSpotsPanel.tsx` - top scout signals panel
- `src/components/research/ResearchPageContent.tsx` - main stress-test workspace
- `src/components/research/AnalyzeTabPanel.tsx` - verdict/analyze surface
- `src/components/slips/SlipIntelBar.tsx` - slip intelligence summary
- `app/(product)/control/ControlPageClient.tsx` - control/live/review client
- `app/(product)/control/ReviewPanel.tsx` - postmortem/review display
- `app/(product)/track/TrackPageClient.tsx` - DURING tracking client
- `src/components/track/OpenTicketsPanel.tsx` - tracked/open tickets summary
- `src/components/track/DuringStageTracker.tsx` - run timeline tracker
- `src/components/nervous/NervousSystemContext.tsx` - query-spine provider
- `src/components/ui/TruthSpineHeader.tsx` - runtime/mode-aware surface header

## Core logic
- `src/core/today/service.server.ts` - today aggregation, fallback, cache/live logic
- `src/core/today/demoToday.ts` - deterministic demo payload
- `src/core/today/boardModel.ts` - board shaping and top spot derivation
- `src/core/today/evidenceTexture.ts` - support/watch-out evidence texturing
- `src/core/pipeline/runSlip.ts` - stress-test pipeline and verdict logic
- `src/core/slips/slipIntelligence.ts` - correlation/fragility/weakest-leg engine
- `src/core/slips/slipRiskSummary.ts` - slip-level summary helpers
- `src/core/slips/draftSlipStore.ts` - draft slip state
- `src/core/slips/storage.ts` - tracked slip storage
- `src/core/slips/demoSlipTracker.ts` - deterministic tracking progression
- `src/core/run/store.ts` - run persistence and retrieval
- `src/core/run/researchRunDTO.ts` - run DTO shaping
- `src/core/slate/slateEngine.ts` - tonight slate summary
- `src/core/slate/leadEngine.ts` - lead ranking engine
- `src/core/slate/reactiveWindow.ts` - reactive/live window detection
- `src/core/journal/buildJournalEntry.ts` - post-track journal derivation
- `src/core/persistence/runtimeStoreProvider.ts` - runtime store backend selection
- `src/core/persistence/supabaseRuntimeStore.ts` - Supabase-backed runtime persistence
- `src/core/control-plane/events.ts` - control-plane event schema
- `src/core/control-plane/emitter.ts` - event emitter implementation
- `src/core/nervous/spine.ts` - canonical query spine
- `src/core/nervous/routes.ts` - route helpers / URL generation
- `src/core/trace/queryTrace.ts` - trace query helpers
- `src/core/ui/truthPresentation.ts` - mode/freshness/truth copy helpers

## API
- `app/api/today/route.ts` - today payload API
- `app/api/today/warm/route.ts` - today cache warming API
- `app/api/events/route.ts` - event emit/list API
- `app/api/postmortem/route.ts` - deterministic postmortem API
- `app/api/run/stress-test/route.ts` - stress-test API route
- `app/api/slips/submit/route.ts` - slip submit API
- `app/api/slips/extract/route.ts` - leg extraction API
- `app/api/slips/parseText/route.ts` - parse text API
- `app/api/provider-health/route.ts` - provider diagnostics API
- `app/api/metrics/calibration/route.ts` - calibration metrics API

## Infra
- `package.json` - scripts, dependencies, quality gates
- `next.config.mjs` - Next.js config and image policy note
- `tsconfig.json` - TypeScript strict config
- `vercel.json` - Vercel cron/function config
- `.github/workflows/ci.yml` - CI, docs, schema, governor, and audit jobs
- `scripts/env-check.mjs` - env validation script
- `scripts/check-schema-drift.mjs` - schema drift guard
- `scripts/docs-check.mjs` - docs consistency checks
- `scripts/audit/routes-manifest.mjs` - route manifest generator
- `scripts/audit/security-guards.mjs` - security-focused static checks
- `scripts/audit/unused-ci.mjs` - unused-code CI audit
- `scripts/ria-audit.mjs` - repo intelligence audit

## DB
- `supabase/schema.sql` - main Supabase schema snapshot
- `db/supabase/schema.sql` - second schema baseline (drift risk)
- `supabase/migrations/20260226110000_phone_from_bed_e2e.sql` - slips/legs/settlements/feedback tables
- `supabase/migrations/20260226140000_outcomes_learning_loop.sql` - outcomes loop tables
- `supabase/migrations/20260227090000_slip_outcomes_calibration.sql` - slip outcome calibration tables
- `supabase/migrations/20260301090000_run_events_table.sql` - run events table and permissive policy note
- `supabase/migrations/20260306100000_today_cache.sql` - today cache table
- `supabase/migrations/20260306120000_today_cache_reconcile.sql` - today cache reconciliation migration

## Tests
- `tests/journey.spec.ts` - Playwright journey audit
- `tests/todayTruth.test.ts` - today truth/fallback coverage
- `tests/spineNavigation.test.ts` - continuity/navigation coverage
- `tests/vercel-cron-alignment.test.ts` - deploy/cron alignment check
- `app/cockpit/__tests__/cockpit.integration.test.tsx` - cockpit integration coverage
- `src/components/today/__tests__/TodayPageClient.test.tsx` - board surface tests
- `src/components/today/__tests__/SlipDrawer.test.tsx` - staged drawer tests
- `src/components/research/__tests__/AnalyzeTabPanel.test.tsx` - verdict/analyze tests
- `src/core/today/__tests__/service.server.test.ts` - today service tests
- `src/core/run/__tests__/runSlip.test.ts` - run pipeline tests
- `src/core/slips/__tests__/slipIntelligence.test.ts` - slip intelligence tests
- `app/api/postmortem/__tests__/route.test.ts` - postmortem API tests
- `app/api/events/__tests__/route.test.ts` - events API tests

## Scripts
- `scripts/audit-repo-state.mjs` - repo state audit script
- `scripts/audit-journey.mjs` - journey audit orchestrator
- `scripts/render-journey-report.mjs` - journey markdown renderer
- `scripts/verify-landing.mjs` - landing verification
- `scripts/verifyTodayCache.ts` - today cache verification
- `scripts/supabase-health.mjs` - Supabase health script
- `scripts/supabase-schema-check.mjs` - Supabase schema validation
- `scripts/check-governor.mjs` - governor checks
