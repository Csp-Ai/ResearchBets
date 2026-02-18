# RIA Invariants

## Hard Rules
- H1: No ad-hoc market strings where MarketType is expected; parsing via asMarketType(value, fallback).
- H2: marketType flows leg → snapshot → persistence → measurement.
- H3: Snapshot path is deterministic unless explicitly documented.
- H4: Missing/invalid markets must use explicit fallback (e.g., asMarketType(value, 'points')).

## Soft Warnings
- S1: Avoid duplicate prop tag/risk/label logic.
- S2: Add tests for prop workflow changes.
- S3: UI should use canonical prop insight builders.
- S4: Claims should be traceable to runtime events/citations.
- S5: Avoid excessive cross-layer coupling.
