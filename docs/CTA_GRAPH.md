# CTA Graph Audit

Generated: 2026-02-26T03:40:53.871Z

## CTA Entries

| Source file | Type | Label | Href | Route category |
| --- | --- | --- | --- | --- |
| app/community/page.tsx | router.push | programmatic navigation | /research?tab=analyze&prefill=${encodeURIComponent(prefill | /research |
| app/traces/[trace_id]/TraceDetailPageClient.tsx | Link | Traces | /traces | /traces |
| src/components/live/LiveGameDetailClient.tsx | router.push | programmatic navigation | buildNavigationHref({
            pathname: /research,
            traceId: currentTraceId,
            params: { gameId: payload.game.gameId }
          } | buildNavigationHref({
            pathname: /research,
            traceId: currentTraceId,
            params: { gameId: payload.game.gameId }
          } |
| src/components/live/LiveGamesClient.tsx | router.push | programmatic navigation | buildNavigationHref({
            pathname: /live/${encodeURIComponent(game.gameId | buildNavigationHref({
            pathname: /live/${encodeURIComponent(game.gameId |
| src/components/TerminalLoopShell.tsx | router.push | programmatic navigation | href | href |
| src/components/landing/VerdictMock.tsx | Link | Stress test now → | /ingest | /ingest |
| src/components/landing/BottomCTA.tsx | Link | Analyze slip | /ingest | /ingest |
| src/components/landing/BottomCTA.tsx | Link | Analyze my slip | /ingest | /ingest |
| src/components/landing/ScoutCardCompact.tsx | Link | Open Scout | /stress-test?tab=scout | /stress-test |
| src/components/landing/PostmortemPreviewCard.tsx | Link | Review results | /control?tab=review | /control |
| src/components/landing/PostmortemPreviewCard.tsx | Link | Try a sample review | /control?tab=review&sample=1 | /control |
| src/components/landing/Hero.tsx | Link | Analyze my slip | /ingest | /ingest |
| src/components/landing/Hero.tsx | Link | Run demo | /stress-test?demo=1 | /stress-test |
| src/components/bettor-os/LandingPageClient.tsx | Link | Analyze a slip | /ingest | /ingest |
| src/components/bettor-os/LandingPageClient.tsx | Link | Scout props | /research?tab=scout | /research |
| src/components/bettor-os/LandingPageClient.tsx | Link | Continue last analysis | /research | /research |
| src/components/terminal/AppShell.tsx | Link | Settings | /settings | /settings |
| src/components/terminal/AppShell.tsx | Link | Dev dashboard | /dev/dashboard | /dev/dashboard |
| src/components/terminal/AppShell.tsx | router.push | programmatic navigation | nervous.toHref(/stress-test | nervous.toHref(/stress-test |
| src/components/terminal/AppShell.tsx | router.push | programmatic navigation | ${nervous.toHref(/stress-test | ${nervous.toHref(/stress-test |
| src/components/terminal/TracesIndexContent.tsx | router.push | programmatic navigation | /traces/${encodeURIComponent(id | /traces/${encodeURIComponent(id |
| src/components/terminal/RunHeaderStrip.tsx | Link | Go to Ingest | /ingest | /ingest |
| src/components/MainNav.tsx | router.push | programmatic navigation | href | href |
| src/components/today/TodayPageClient.tsx | router.push | programmatic navigation | /stress-test?tab=analyze&prefillKey=${encodeURIComponent(SCOUT_ANALYZE_PREFILL_STORAGE_KEY | /stress-test |
| src/components/today/TodayPageClient.tsx | router.push | programmatic navigation | /slip | /slip |
| src/components/research/ResearchPageContent.tsx | router.replace | programmatic navigation | ${nervous.toHref(/stress-test, { traceId } | ${nervous.toHref(/stress-test, { traceId } |
| src/components/research/ResearchPageContent.tsx | router.replace | programmatic navigation | ${nervous.toHref(/stress-test, { traceId } | ${nervous.toHref(/stress-test, { traceId } |
| src/components/research/ResearchPageContent.tsx | router.push | programmatic navigation | /stress-test?trace=${encodeURIComponent(traceId | /stress-test |
| src/components/research/ResearchPageContent.tsx | router.push | programmatic navigation | ${nervous.toHref(/stress-test | ${nervous.toHref(/stress-test |
| src/components/research/ResearchPageContent.tsx | router.push | programmatic navigation | nervous.toHref(/ingest | nervous.toHref(/ingest |
| src/components/research/ResearchPageContent.tsx | router.push | programmatic navigation | ${nervous.toHref(/ingest | ${nervous.toHref(/ingest |
| src/components/research/ResearchPageContent.tsx | router.push | programmatic navigation | ${nervous.toHref(/stress-test | ${nervous.toHref(/stress-test |
| src/components/bettor/BettorFirstBlocks.tsx | Link | Open run details | /traces | /traces |
| src/components/bettor/GuidedActionsCard.tsx | Link | Go to Discover | /dashboard | /dashboard |
| app/dev/dashboard/DevDashboardPageClient.tsx | Link | Open traces | /traces | /traces |
| app/settings/page.tsx | Link | Open traces | /traces | /traces |
| app/ingest/IngestPageClient.tsx | router.push | programmatic navigation | /research?trace=${encodeURIComponent(traceId | /research |
| app/control/ControlPageClient.tsx | Link | Try sample slip | /stress-test?demo=1 | /stress-test |
| app/control/ControlPageClient.tsx | Link | Build from Board | /slip | /slip |
| app/slip/page.tsx | router.push | programmatic navigation | /stress-test?tab=analyze&prefillKey=${encodeURIComponent(SCOUT_ANALYZE_PREFILL_STORAGE_KEY | /stress-test |

## Findings

- **duplicate_label**: {"severity":"warn","type":"duplicate_label","label":"programmatic navigation","hrefs":["/research?tab=analyze&prefill=${encodeURIComponent(prefill","buildNavigationHref({\n            pathname: /research,\n            traceId: currentTraceId,\n            params: { gameId: payload.game.gameId }\n          }","buildNavigationHref({\n            pathname: /live/${encodeURIComponent(game.gameId","href","nervous.toHref(/stress-test","${nervous.toHref(/stress-test","/traces/${encodeURIComponent(id","/stress-test?tab=analyze&prefillKey=${encodeURIComponent(SCOUT_ANALYZE_PREFILL_STORAGE_KEY","/slip","${nervous.toHref(/stress-test, { traceId }","/stress-test?trace=${encodeURIComponent(traceId","nervous.toHref(/ingest","${nervous.toHref(/ingest","/research?trace=${encodeURIComponent(traceId"]}
- **context_loss_risk**: {"severity":"warn","type":"context_loss_risk","file":"src/components/landing/VerdictMock.tsx","href":"/ingest","label":"Stress test now →"}
- **context_loss_risk**: {"severity":"warn","type":"context_loss_risk","file":"src/components/landing/BottomCTA.tsx","href":"/ingest","label":"Analyze slip"}
- **context_loss_risk**: {"severity":"warn","type":"context_loss_risk","file":"src/components/landing/BottomCTA.tsx","href":"/ingest","label":"Analyze my slip"}
- **context_loss_risk**: {"severity":"warn","type":"context_loss_risk","file":"src/components/landing/ScoutCardCompact.tsx","href":"/stress-test?tab=scout","label":"Open Scout"}
- **context_loss_risk**: {"severity":"warn","type":"context_loss_risk","file":"src/components/landing/PostmortemPreviewCard.tsx","href":"/control?tab=review","label":"Review results"}
- **context_loss_risk**: {"severity":"warn","type":"context_loss_risk","file":"src/components/landing/PostmortemPreviewCard.tsx","href":"/control?tab=review&sample=1","label":"Try a sample review"}
- **context_loss_risk**: {"severity":"warn","type":"context_loss_risk","file":"src/components/landing/Hero.tsx","href":"/ingest","label":"Analyze my slip"}
- **context_loss_risk**: {"severity":"warn","type":"context_loss_risk","file":"src/components/landing/Hero.tsx","href":"/stress-test?demo=1","label":"Run demo"}
- **context_loss_risk**: {"severity":"warn","type":"context_loss_risk","file":"src/components/today/TodayPageClient.tsx","href":"/stress-test?tab=analyze&prefillKey=${encodeURIComponent(SCOUT_ANALYZE_PREFILL_STORAGE_KEY","label":"programmatic navigation"}
- **context_loss_risk**: {"severity":"warn","type":"context_loss_risk","file":"src/components/today/TodayPageClient.tsx","href":"/slip","label":"programmatic navigation"}
