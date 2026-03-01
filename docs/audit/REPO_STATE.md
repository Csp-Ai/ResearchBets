## v0.6.x → DURING tracker + canonical ids hardening

- Added a bettor-facing DURING stage tracker on slip/track surfaces with proof rows sourced from `/api/events` polling.
- Extended pipeline telemetry to emit enrich/score/verdict/persist milestones in-order with bettor-safe reason strings.
- Standardized bettor-path query params toward canonical snake_case (`trace_id`, `slip_id`) while preserving read compatibility.
- Replaced primary bettor-path raw links with nervous spine-preserving navigation helpers.
- Hardened Today payload behavior so demo/cache cannot silently go empty; strict live empty now returns explicit `strict_live_empty`.

## v0.7.0 → perf + nervous system landing

- Split AppShell rendering so `/` bypasses the heavy product shell while keeping nervous spine context available globally.
- Reframed landing first fold around SSR board truth + compact DURING tracker + continuity CTAs to keep alive state visible with lower hydration cost.
- Added compact tracker volatility-driver chip heuristics (blowout/minutes/pace/foul/unknown) without adding providers.
- Removed dead `/slips/new` continuity break by adding a redirect route to canonical `/slip` and replacing stale CTA wiring.
- Expanded landing import guard coverage to block pipeline-heavy modules on first fold entry points.
