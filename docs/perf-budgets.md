# Perf Budgets (Sprint 7 baseline)

## Route budget notes

- `/stress-test` is currently the heaviest interactive route and should remain split-first next sprint.
- `/` (landing) and `/today` are time-to-value surfaces and must avoid importing stress-test pipeline modules directly.
- Keep edge display logic on landing/today in shared pure helpers (`src/core/markets/edgePrimitives.ts`).

## Guardrails

1. Landing must not import `src/core/pipeline/runSlip` or research-heavy panels.
2. Landing must not import `server-only` modules.
3. `/today` should consume normalized board payloads and lightweight tracker polling only.

## CI check

Use: `npm run check:landing-imports`

This fails when landing imports server-only or stress-test heavy modules.
