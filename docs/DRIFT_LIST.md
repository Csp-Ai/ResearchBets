# Drift Checklist

- [ ] **P1** `app/(product)/settings/page.tsx`, `app/(product)/dev/dashboard/DevDashboardPageClient.tsx`, `app/(product)/traces/[trace_id]/TraceDetailPageClient.tsx`: direct `href="/traces"` bypasses canonical spine propagation. Proposed fix: route through nervous `toHref('/traces')` or shared spine-link component.
- [ ] **P1** `src/components/landing/navigation.ts` + many client callers: `appendQuery` is used as a general URL builder for spine-sensitive requests/navigation. Proposed fix: add spine-aware API URL helper and migrate high-traffic flows (`cockpit`, `research`, `live`, `today`).
- [ ] **P1** `app/api/env/status/route.ts`: runtime constant missing despite diagnostics invariant requiring nodejs runtime. Proposed fix: add `export const runtime = 'nodejs'` and test coverage.
- [ ] **P2** `src/core/live/modeResolver.server.ts`, `src/core/mode/policy.ts`, `app/cockpit/hooks/useCockpitToday.ts`: mode resolution is split across 3 paths. Proposed fix: establish one canonical resolver and keep other layers as pure presenters.
- [ ] **P2** `src/core/routing/preserveQueryRedirect.ts`: passthrough redirect preserves arbitrary keys without spine normalization. Proposed fix: optionally normalize known spine keys on landing redirects while preserving unknown additive params.
- [ ] **P2** `src/components/_archive/*`: archived UI remains shippable and searchable, increasing accidental reuse risk. Proposed fix: add explicit deprecation banner and move behind archived barrel or exclude from build paths.
- [ ] **P2** `src/core/persistence/supabaseRuntimeStore.ts` + `/api/events`: analytics schema degradation is handled, but only reactively. Proposed fix: add startup/table contract check for `events_analytics` columns and expose status in diagnostics.
- [ ] **P3** `docs/audits/knip-report.json`: potential orphan exports/files are documented but stale. Proposed fix: rerun dead-code scan and convert confirmed orphans into delete/deprecate PRs.
