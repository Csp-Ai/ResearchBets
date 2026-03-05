# ResearchBets agent/runtime guide

This file documents the **intelligence modules** currently active in the codebase and the operating rules for extending them.

## Intelligence modules

### 1) Today slate aggregation (`/api/today`)

- Entry points: `app/page.tsx`, `app/api/today/route.ts`.
- Core module: `src/core/today/service.server.ts`.
- Behavior:
  - Reads `LIVE_MODE`.
  - In live mode, attempts provider-backed events via server provider registry.
  - Pipeline step taxonomy for diagnostics/debug:
    - `resolve_context`: true context/spine/trace resolution failures only.
    - `events_fetch`: provider event slate fetch (`fetchEvents`).
    - `odds_fetch`: provider market/odds fetch (`fetchEventOdds`).
    - `stats_fetch`: stats enrichment fetch.
    - `normalize`: row/game normalization stage.
    - `board_build`: board construction stage.
    - `live_viability`: non-exception live viability checks and deterministic fallback decisions.
  - Invariant: provider failures must not be emitted as `resolve_context` warnings.
  - On provider failure (or when live mode is off), falls back to deterministic demo payload from `src/core/today/demoToday.ts`.
  - Returns `mode: live | cache | demo` and optional `reason`.

### 2) Slip intelligence engine

- Core module: `src/core/slips/slipIntelligence.ts` (`computeSlipIntelligence`).
- UI surface: `src/components/slips/SlipIntelBar.tsx`.
- Draft state sources: `src/core/slips/draftSlipStore.ts`, `src/hooks/useDraftSlip.ts`.
- Purpose: convert slip leg concentration into deterministic risk cues:
  correlation, fragility, volatility tier, exposure concentration, weakest-leg hints.

### 3) Stress-test pipeline

- Core run path: `src/core/pipeline/runSlip.ts`.
- Verdict logic: `computeVerdict` in `runSlip.ts`.
- Flow:
  1. Submit + extract via `/api/slips/submit` and `/api/slips/extract`.
  2. Enrich legs with providers/fallback data.
  3. Score per-leg downside and produce confidence + weakest-leg reasoning.

### 4) Postmortem classifier

- API: `app/api/postmortem/route.ts`.
- Deterministic behavior:
  - Reuses `computeSlipIntelligence` on provided legs.
  - Classifies process/correlation/injury/line-value misses through fixed heuristics.
  - Returns stable notes for review workflows in Control Room.

### 5) Telemetry and event stream

- API: `app/api/events/route.ts`.
- Event schema: `src/core/control-plane/events.ts`.
- Emission: `src/core/control-plane/emitter.ts` and route-level emitters.
- Purpose: trace lifecycle actions (`slip_submitted`, `slip_extracted`, live/outcome events, etc.) and support review/debug tooling.

## Rules

### Client/server boundaries

- Do not import `server-only` modules into client components.
- Keep provider registry + env-bound logic in server routes/services.
- UI components should consume API payloads or shared serializable contracts.

### Deterministic-first in demo mode

- Demo mode must stay reproducible and safe when providers are missing.
- New intelligence code must define fallback behavior and avoid hard failures when external keys are absent.

### Adding a new intelligence module safely

1. Define module contract and deterministic fallback path first.
2. Keep compute logic pure where possible (testable without network).
3. Add route-level or feature-level tests for happy path + fallback/degraded path.
4. Emit structured telemetry events for observability.
5. Document new module in `README.md` and `docs/ARCHITECTURE.md`.
