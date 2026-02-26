# Journey Report

Generated: 2026-02-26T03:41:13.586Z

## Scenario results

- **FAILED** journey 1: Landing → Board Analyze → Stress Test Scout → Build Slip → Control Room (journey.spec.ts)
- **FAILED** journey 2: Landing → Analyze my slip → Ingest paste → Research (journey.spec.ts)

## Context audit

- Required keys audited: mode, sport, tz, date, gameId, propId, slipId, trace.
- journey 1: Landing → Board Analyze → Stress Test Scout → Build Slip → Control Room: context chain potentially broken.
- journey 2: Landing → Analyze my slip → Ingest paste → Research: context chain potentially broken.

## Missing artifact warnings

- ⚠️ journey 1: Landing → Board Analyze → Stress Test Scout → Build Slip → Control Room: above-fold artifact may be empty or route dead-ended.
- ⚠️ journey 2: Landing → Analyze my slip → Ingest paste → Research: above-fold artifact may be empty or route dead-ended.

## Screenshots

- None (runtime audit unavailable).
