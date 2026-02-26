# Repo inspection Q&A (2026-02-26)

Snapshot findings for canonical board contract, edge primitives, demo realism, providers, context spine, trace timeline, decision object, perf, Supabase alignment, and mobile entry loop.

## Key findings

1. Board contract currently has multiple shapes: `TodayPayload.games[].propsPreview[]` (`TodayPropKey`), normalized `board[]` (`NormalizedBoardProp`), and UI card VM (`BoardCardVM`).
2. Implied probability math is centralized in `src/core/markets/impliedProbabilities.ts`; stress-test risk/confidence is in `src/core/pipeline/runSlip.ts`; demo hit-rates/risk tags for extract are deterministic tables in `src/core/slips/propInsights.ts`.
3. Demo realism is deterministic fixture + seeded fallback (`DEMO_TODAY_PAYLOAD`, `fallbackToday`, board seeded scouts).
4. Provider boundary is adapter/registry based (`sportsdataio`, `theoddsapi`, provider registry), with safe fallback when keys are absent.
5. ContextSpine canonical keys are defined and normalized (`sport,tz,date,mode,...`) and injected into today/slips/events via route helpers + emitters.
6. Trace timeline source of truth is events persisted by `DbEventEmitter` and queried via `/api/events?trace_id=...`, with polling in `useTraceEvents`.
7. Decision object is `SlipStructureReport` plus `VerdictAnalysis` merged in run pipeline.
8. Perf: current build shows `/stress-test` is the largest route at `150 kB / 292 kB first load`.
9. Supabase v1.0 tables for slips loop exist in `20260226110000_phone_from_bed_e2e.sql`, plus runtime `slip_submissions` table in `schema.sql`.
10. Mobile primary CTA from landing currently points to `/ingest`; `/today` exists both as route page and API.
