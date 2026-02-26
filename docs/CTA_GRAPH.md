# CTA Graph Audit

Generated: 2026-02-26T03:22:38.556Z

## CTA Entries

| Source file | Type | Label | Href | Route category |
| --- | --- | --- | --- | --- |
| app/ingest/IngestPageClient.tsx | router.push | programmatic navigation | /research?trace=${encodeURIComponent(traceId | /research |
| app/control/ControlPageClient.tsx | Link | Try sample slip | /stress-test?demo=1 | /stress-test |
| app/control/ControlPageClient.tsx | Link | Build from Board | /slip | /slip |
| src/components/terminal/AppShell.tsx | Link | Settings | /settings | /settings |
| src/components/terminal/AppShell.tsx | Link | Dev dashboard | /dev/dashboard | /dev/dashboard |
| src/components/terminal/AppShell.tsx | router.push | programmatic navigation | /stress-test | /stress-test |
| src/components/terminal/AppShell.tsx | router.push | programmatic navigation | /stress-test?tab=analyze&prefillKey=${encodeURIComponent(SCOUT_ANALYZE_PREFILL_STORAGE_KEY | /stress-test |
| src/components/terminal/RunHeaderStrip.tsx | Link | Go to Ingest | /ingest | /ingest |
| src/components/terminal/TracesIndexContent.tsx | router.push | programmatic navigation | /traces/${encodeURIComponent(id | /traces/${encodeURIComponent(id |
| src/components/MainNav.tsx | router.push | programmatic navigation | href | href |
| app/traces/[trace_id]/TraceDetailPageClient.tsx | Link | Traces | /traces | /traces |
| app/community/page.tsx | router.push | programmatic navigation | /research?tab=analyze&prefill=${encodeURIComponent(prefill | /research |
| src/components/landing/BottomCTA.tsx | Link | Analyze slip | /ingest | /ingest |
| src/components/landing/BottomCTA.tsx | Link | Analyze my slip | /ingest | /ingest |
| src/components/landing/PostmortemPreviewCard.tsx | Link | Review results | /control?tab=review | /control |
| src/components/landing/PostmortemPreviewCard.tsx | Link | Try a sample review | /control?tab=review&sample=1 | /control |
| src/components/landing/VerdictMock.tsx | Link | Stress test now → | /ingest | /ingest |
| src/components/landing/LandingPageClient.tsx | Link | Analyze | /ingest | /ingest |
| src/components/landing/LandingPageClient.tsx | Link | Research | /stress-test | /stress-test |
| src/components/landing/LandingPageClient.tsx | Link | Build Slip | /slip | /slip |
| src/components/landing/LandingPageClient.tsx | Link | Analyze | /ingest | /ingest |
| src/components/landing/LandingPageClient.tsx | Link | Open live view | /control?tab=live | /control |
| src/components/landing/ScoutCardCompact.tsx | Link | Open Scout | /stress-test?tab=scout | /stress-test |
| src/components/landing/Hero.tsx | Link | Analyze my slip | /ingest | /ingest |
| src/components/landing/Hero.tsx | Link | Run demo | /stress-test?demo=1 | /stress-test |
| src/components/landing/TonightsBoardPreview.tsx | Link | Open full Scout | /stress-test?tab=scout | /stress-test |
| app/slip/page.tsx | router.push | programmatic navigation | /stress-test?tab=analyze&prefillKey=${encodeURIComponent(SCOUT_ANALYZE_PREFILL_STORAGE_KEY | /stress-test |
| src/components/bettor-os/LandingPageClient.tsx | Link | Analyze a slip | /ingest | /ingest |
| src/components/bettor-os/LandingPageClient.tsx | Link | Scout props | /research?tab=scout | /research |
| src/components/bettor-os/LandingPageClient.tsx | Link | Continue last analysis | /research | /research |
| src/components/TerminalLoopShell.tsx | router.push | programmatic navigation | href | href |
| app/dev/dashboard/DevDashboardPageClient.tsx | Link | Open traces | /traces | /traces |
| src/components/research/ResearchPageContent.tsx | router.replace | programmatic navigation | /stress-test?tab=analyze&trace=${encodeURIComponent(traceId | /stress-test |
| src/components/research/ResearchPageContent.tsx | router.replace | programmatic navigation | /stress-test?tab=analyze&trace=${encodeURIComponent(traceId | /stress-test |
| src/components/research/ResearchPageContent.tsx | router.push | programmatic navigation | /stress-test?trace=${encodeURIComponent(traceId | /stress-test |
| src/components/research/ResearchPageContent.tsx | router.push | programmatic navigation | /stress-test?tab=${candidate} | /stress-test |
| src/components/research/ResearchPageContent.tsx | router.push | programmatic navigation | /ingest | /ingest |
| src/components/research/ResearchPageContent.tsx | router.push | programmatic navigation | /ingest?prefill=${encodeURIComponent(DEMO_SLIP | /ingest |
| src/components/research/ResearchPageContent.tsx | router.push | programmatic navigation | /stress-test?trace=${encodeURIComponent(recentTraceId | /stress-test |
| src/components/bettor/BettorFirstBlocks.tsx | Link | Open run details | /traces | /traces |
| src/components/bettor/GuidedActionsCard.tsx | Link | Go to Discover | /dashboard | /dashboard |
| src/components/live/LiveGamesClient.tsx | router.push | programmatic navigation | buildNavigationHref({
            pathname: /live/${encodeURIComponent(game.gameId | buildNavigationHref({
            pathname: /live/${encodeURIComponent(game.gameId |
| src/components/live/LiveGameDetailClient.tsx | router.push | programmatic navigation | buildNavigationHref({
            pathname: /research,
            traceId: currentTraceId,
            params: { gameId: payload.game.gameId }
          } | buildNavigationHref({
            pathname: /research,
            traceId: currentTraceId,
            params: { gameId: payload.game.gameId }
          } |
| src/components/today/TodayPageClient.tsx | router.push | programmatic navigation | /stress-test?tab=analyze&prefillKey=${encodeURIComponent(SCOUT_ANALYZE_PREFILL_STORAGE_KEY | /stress-test |
| src/components/today/TodayPageClient.tsx | router.push | programmatic navigation | /slip | /slip |
| app/settings/page.tsx | Link | Open traces | /traces | /traces |

## Findings

- **duplicate_label**: {"severity":"warn","type":"duplicate_label","label":"programmatic navigation","hrefs":["/research?trace=${encodeURIComponent(traceId","/stress-test","/stress-test?tab=analyze&prefillKey=${encodeURIComponent(SCOUT_ANALYZE_PREFILL_STORAGE_KEY","/traces/${encodeURIComponent(id","href","/research?tab=analyze&prefill=${encodeURIComponent(prefill","/stress-test?tab=analyze&trace=${encodeURIComponent(traceId","/stress-test?trace=${encodeURIComponent(traceId","/stress-test?tab=${candidate}","/ingest","/ingest?prefill=${encodeURIComponent(DEMO_SLIP","/stress-test?trace=${encodeURIComponent(recentTraceId","buildNavigationHref({\n            pathname: /live/${encodeURIComponent(game.gameId","buildNavigationHref({\n            pathname: /research,\n            traceId: currentTraceId,\n            params: { gameId: payload.game.gameId }\n          }","/slip"]}
- **missing_context_handoff**: {"severity":"warn","type":"missing_context_handoff","file":"src/components/landing/BottomCTA.tsx","href":"/ingest","label":"Analyze slip"}
- **missing_context_handoff**: {"severity":"warn","type":"missing_context_handoff","file":"src/components/landing/BottomCTA.tsx","href":"/ingest","label":"Analyze my slip"}
- **missing_context_handoff**: {"severity":"warn","type":"missing_context_handoff","file":"src/components/landing/VerdictMock.tsx","href":"/ingest","label":"Stress test now →"}
- **missing_context_handoff**: {"severity":"warn","type":"missing_context_handoff","file":"src/components/landing/LandingPageClient.tsx","href":"/ingest","label":"Analyze"}
- **missing_context_handoff**: {"severity":"warn","type":"missing_context_handoff","file":"src/components/landing/LandingPageClient.tsx","href":"/ingest","label":"Analyze"}
- **missing_context_handoff**: {"severity":"warn","type":"missing_context_handoff","file":"src/components/landing/Hero.tsx","href":"/ingest","label":"Analyze my slip"}
- **missing_context_handoff**: {"severity":"warn","type":"missing_context_handoff","file":"src/components/research/ResearchPageContent.tsx","href":"/ingest","label":"programmatic navigation"}
- **missing_context_handoff**: {"severity":"warn","type":"missing_context_handoff","file":"src/components/research/ResearchPageContent.tsx","href":"/ingest?prefill=${encodeURIComponent(DEMO_SLIP","label":"programmatic navigation"}
