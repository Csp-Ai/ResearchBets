## v0.6.x → DURING tracker + canonical ids hardening

- Added a bettor-facing DURING stage tracker on slip/track surfaces with proof rows sourced from `/api/events` polling.
- Extended pipeline telemetry to emit enrich/score/verdict/persist milestones in-order with bettor-safe reason strings.
- Standardized bettor-path query params toward canonical snake_case (`trace_id`, `slip_id`) while preserving read compatibility.
- Replaced primary bettor-path raw links with nervous spine-preserving navigation helpers.
- Hardened Today payload behavior so demo/cache cannot silently go empty; strict live empty now returns explicit `strict_live_empty`.
