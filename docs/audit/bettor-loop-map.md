# Bettor Loop Map (Route + State Spine)

Scope: current App Router routes tied to the bettor journey.

## Loop framing
- **BEFORE**: `/today` → `/slip`
- **DURING**: `/stress-test` (+ optional `/control?tab=live`)
- **AFTER**: `/control?tab=review` (+ `POST /api/postmortem`)

---

## Route map

| Route | Primary user intent | Primary data dependency | URL spine vs store state | Biggest UX failure today |
|---|---|---|---|---|
| `/` | Understand product promise and enter the workflow quickly. | `LandingPageClient` plus `/api/today` landing summary path via today service (`getTodayPayload`). | Spine keys not strongly surfaced on landing; mostly route entry point. | Landing does not explicitly establish the BEFORE→DURING→AFTER loop handoff in one glance. |
| `/today` | Scan slate fast (sport/timezone/date), find candidate props, add/analyze. | Server prefetch `getTodayPayload`; client refresh from `/api/today`; draft-leg writes via `upsertDraftLeg`. | `sport/tz/date/mode` are in URL spine via `useNervousSystem`; draft legs are session-backed (`DraftSlipStore`). | “Board” is useful, but weakest-leg context is deferred; add/analyze actions still feel disconnected from persistent run identity (`trace_id`). |
| `/slip` | Build and refine 2–4 leg draft quickly. | Fetches `/api/today` for game cards; uses `useDraftSlip` (`sessionStorage`) + `SlipIntelBar`. | Spine maintained for board fetch and links; slip composition itself is only session state. | Slip composition does not establish a canonical `slipId`/`trace_id` early, so continuity into run telemetry is fragile. |
| `/stress-test` | Run analysis, identify weakest leg in <10s, decide remove/swap/place. | `runSlip` pipeline + `runStore` (local/supabase browser store), `/api/bettor-data`, `/api/research/demo-run`, optional `/api/researchSnapshot/:id`. | Tab + trace query in URL; pasted/scout prefill passes via sessionStorage key; run records are local store first. | Excellent analysis depth exists, but key timeline/progress states are implicit rather than visualized as a bettor-facing “run tracker.” |
| `/control` | Manage live risk and perform postmortem review after settlement. | Live tab uses `useDraftSlip`; review tab runs `runSlip` + `POST /api/postmortem`; can open latest run trace. | `tab` in URL; postmortem payload mostly component-local; last result cached in localStorage. | “Live” and “Review” are mixed with mock parse behavior; bettor may not trust what is simulated vs real ingestion without stronger status framing. |

---

## Relevant API route map for the loop

| API route | Loop phase | Intent |
|---|---|---|
| `GET /api/today` | BEFORE | Unified board payload with `live/cache/demo` semantics and fallback reasoning. |
| `POST /api/slips/submit` | BEFORE→DURING | Persist raw slip + emit `slip_submitted` event with `trace_id`. |
| `POST /api/slips/extract` | DURING | Parse legs + insights + emit extraction success/fail events. |
| `GET/POST /api/events` | DURING | Query or emit control-plane event tape by `trace_id`. |
| `GET /api/bettor-data` | DURING | Aggregated envelope for scout/live/analyze tabs. |
| `GET /api/research/demo-run` | DURING | Deterministic demo recent-run object + CTA links with spine query. |
| `POST /api/postmortem` | AFTER | Deterministic miss classification + next-step notes from provided legs/outcome. |

---

## Observed loop breakpoints
1. **No hard canonical handoff object** between `/slip` and `/stress-test` (draft is session-only until run executes).
2. **`trace_id` appears late**; many BEFORE interactions cannot be tied to a run timeline.
3. **Decision support vs telemetry** is uneven: rich backend event and run data exists, but bettor-facing progression UI is still sparse outside trace/dev surfaces.
