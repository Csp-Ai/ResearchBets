# Backend Visualization Inventory

Focus: what backend contracts already exist and can be visualized immediately with minimal new backend work.

## Core route/service inventory

| Endpoint / service | Inputs | Outputs | Mode / fallback behavior | Immediate UI visualization opportunity |
|---|---|---|---|---|
| `GET /api/today` (`app/api/today/route.ts`) | Query: `refresh`, `demo`, `sport`, `tz`, `date` | `TodayPayload` (`mode`, `games`, `reason`, `providerErrors`, `landing`) | Uses `getTodayPayload`; provider-backed board in live mode, cache mode on TTL hit, deterministic demo fallback on failure/disabled/live missing keys. | Board cards can show “mode badge + why” per refresh, plus a board freshness timer and fallback reason drawer. |
| `getTodayPayload` (`src/core/today/service.server.ts`) | `forceRefresh`, `demoRequested`, `sport`, `tz`, `date` | Canonical today payload mapped from board service | Internal cache TTL with `mode: cache` overlay; landing summary normalized reason codes. | Render a compact “data quality strip” at top of `/today` and `/slip` to explain confidence context. |
| `getBoardData` (`src/core/board/boardService.server.ts`) | sport/date/tz + demo request | Board games/scouts and provider diagnostics | Resolves provider registry in live; deterministic scouts fallback with user-safe reason. | Scout cards can display source provenance and degrade indicators already returned by board. |
| `POST /api/slips/submit` | Body: `anon_session_id`, `source`, `raw_text`, `request_id`, optional `trace_id/user_id` | `{ slip_id, trace_id }` | Rate-limited; persists submission and emits `slip_submitted`. | Slip “Start analysis” button can create a visible run ticket (`slip_id + trace_id`) before extraction. |
| `POST /api/slips/extract` | Body: `slip_id`, `request_id`, `anon_session_id` | `{ slip_id, extracted_legs, leg_insights, trace_id }` | Emits `slip_extracted` or `slip_extract_failed`; updates parse status in store. | DURING timeline can show Parse step status + extracted leg cards + failure retry state. |
| `POST /api/events` + `GET /api/events` | POST: control-plane event payload; GET: `trace_id`, `limit` | POST `{ok}`; GET `{ok, events}` | Event list can degrade to empty when analytics schema missing (guarded fallback). | A bettor-friendly “pizza tracker” can be driven entirely by events grouped by stage/agent. |
| `ControlPlaneEventSchema` (`src/core/control-plane/events.ts`) | Structured event fields (`event_name`, `trace_id`, etc.) | Validated control-plane event object | Strong schema guarantees across emitters. | Convert raw tape into human labels: Submitted → Extracted → Enriched → Verdict → Settled. |
| `DbEventEmitter.emit` (`src/core/control-plane/emitter.ts`) | Event payload | persisted event row | Writes to runtime store analytics/event table | Surface event confidence/agent labels without new backend transforms. |
| `runSlip` (`src/core/pipeline/runSlip.ts`) | Raw slip text + optional options (coverage agent toggle) | `traceId` (and persisted run in `runStore`) | Deterministic fallback in provider misses; computes risk and weakest-leg verdict. | Run progress UI can show deterministic per-leg risk contributions and confidence caps. |
| `computeVerdict` (`src/core/pipeline/runSlip.ts`) | Enriched + extracted legs + source stats | `confidencePct`, `weakestLegId`, reasons, risk label, data quality notes | Confidence capped when sources fallback/unverified injuries dominate. | “Why weakest?” and “confidence capped because …” are already available as decision messaging. |
| `GET /api/bettor-data` | Query/header: sport/tz/date/demo/live override | `BettorDataEnvelope` | Gateway chooses live/demo/fallback based on mode override and provider availability. | Scout + Live panels can consume one envelope and stop duplicating derivations client-side. |
| `GET /api/research/demo-run` | Query: sport/tz/date/mode | Deterministic `RecentRunDemo` with CTAs | Always available demo object; CTA URLs preserve context query | Use as empty-state “sample tracker” card with one-click seeded flow. |
| `POST /api/researchSnapshot/start` | subject/session/user/tier/seed/marketType | accepted payload incl. `traceId`, `runId`, `snapshotId` | Rate-limited; deterministic build path with emitted snapshot events | Add explicit “snapshot build in progress” toast + link to snapshot details. |
| `GET /api/researchSnapshot/[id]` | path param `id` | snapshot report + legs + insights + recommendations | Emits `snapshot_viewed`; can return degraded schema-invalid subset | Snapshot inspector can power AFTER calibration cards tied to recommendation outcomes. |
| `POST /api/postmortem` | `{ legs, outcome }` | classification booleans + notes + slip intelligence metrics | Deterministic heuristics, no provider dependency | Postmortem card can render miss taxonomy + automatic “what to change next” bullets now. |
| `GET /api/history-bets` + `POST /api/history-bets` | GET none; POST `slipText`, `outcome`, optional line/time | list/add history bet records | In-memory history store currently | AFTER journal timeline can be shown immediately (demo-safe), then later backed by durable store. |
| `GET/POST /api/bets` | Query status or create bet body | list or created bet | Idempotency + schema validation + event emission (`bet_logged`) | Placed-bet confirmation panel can immediately show CLV-ready fields and settlement readiness. |
| `GET /api/live/game/[gameId]` | path gameId + optional sport | game snapshot + cached model + props + heuristics envelope | Schema fallback to demo + degraded flags | DURING live monitor can render microstructure/props momentum with degrade warning chips. |
| `GET /api/live/outcome/[gameId]` | path gameId + optional sport/trace | outcome snapshot + edge realization side effects | deterministic score fallback + short TTL cache | AFTER phase can auto-populate settlement delta and “edge realized” summary cards. |

## Store/persistence contracts relevant to visualization
- `RuntimeStore` supports slip submissions, events, snapshots, bets, outcomes, insight nodes, and experiment assignments (`src/core/persistence/runtimeStore.ts`).
- Runtime backend switches memory vs Supabase via environment, with dev/prod behavior centralized in provider (`src/core/persistence/runtimeStoreProvider.ts`).
- `runStore` in browser keeps research runs in localStorage with Supabase browser fallback when configured (`src/core/run/store.ts`).

## Key audit conclusion
Most missing UX is not missing backend capability; it is **presentation + contract continuity** (trace/slip identity, stage timeline, and confidence framing) across existing endpoints.
