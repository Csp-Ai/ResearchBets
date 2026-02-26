# Prioritized Execution Backlog (Next 10 PRs)

Guiding principle: preserve Decision Terminal work, reduce bettor friction, and keep truthful demo/live framing.

| # | Title | Why it matters (bettor value) | Likely files touched | Risk | Verification steps |
|---|---|---|---|---|---|
| 1 | Canonical spine enforcement across bettor routes | Prevents context loss (sport/tz/date/mode) and inconsistent run links. | `src/core/nervous/spine.ts`, `src/core/nervous/routes.ts`, `/today`, `/slip`, `/stress-test`, `/control` link points | Low | URL snapshot tests for preserved keys on all nav actions. |
| 2 | Standardize `trace_id` propagation (drop alias writes) | Improves replayability and trace lookup clarity. | `ResearchPageContent`, control links, helpers for query normalization | Low | Unit tests ensuring navigation writes `trace_id` only. |
| 3 | Introduce early `slipId` issuance on first draft action | Gives continuity BEFORE→DURING; avoids session-only ambiguity. | `DraftSlipStore`, `/slip`, `/today`, potentially `/api/slips/submit` integration point | Medium | E2E: add leg, reload, continue with same `slipId` visible. |
| 4 | Add DURING run tracker strip backed by `/api/events` | User can tell status in <10s without dev trace page. | `ResearchPageContent`, `AnalyzeTabPanel`, new tracker component/hook | Medium | Simulated events test + visual assertion for stage transitions. |
| 5 | Show mode/fallback reason chips consistently (today/slip/stress) | Trust and emotional neutrality in demo/live status. | `TodayHeader`, `SlipPageClient`, verdict header blocks | Low | UI tests confirming mode labels and fallback reason text exist. |
| 6 | Upgrade scout cards with action-forward rationale preview | Faster selection from board; less cognitive load. | `GamesSection`, `TopSpotsPanel`, today card components | Low | UX test: actionable rationale appears for each displayed scout. |
| 7 | Add explicit swap/remove recommendation panel in Analyze | Converts verdict data into immediate action, not just diagnostics. | `AnalyzeTabPanel`, `BettorFirstBlocks`, run DTO mapping | Medium | Snapshot test with deterministic weakest leg + suggested next step. |
| 8 | Extract shared `PostmortemCard` and embed in review + stress-test | Closes AFTER loop with consistent calibration artifact. | `ControlPageClient`, `ResearchPageContent`, new shared component | Medium | Integration test posting to `/api/postmortem` and rendering card. |
| 9 | Connect history + bets endpoints into calibration timeline | Gives longitudinal learning beyond one-off reviews. | `/control` review UI, `app/api/history-bets`, optional `/api/bets` reads | Medium | Manual flow: settle/postmortem shows ordered recent calibration items. |
| 10 | Retire/flag dev-only traces from bettor-facing nav | Reduce confusion and keep Decision Terminal power in proper context. | main nav, traces route gating, docs references | Low | Verify non-dev env does not expose `/traces` entry points. |

## Sequencing note
- Execute 1→4 first to solidify contract and progress clarity.
- 5→8 improve decision UX directly.
- 9→10 handle calibration depth and hygiene.
