# RIA Report

## Executive summary
- Mode: pr
- Drift total: **5/100**
- Hard violations: **0**
- Soft warnings: **0**

## Drift score breakdown
- Market Discipline Drift: 0/25
- Flow Integrity Drift: 0/25
- Determinism & Reproducibility Drift: 5/25
- Observability & Measurement Drift: 0/25

## Repo flow map
- ingestion → normalization → snapshot → persistence → measurement → UI replay

## Hard violations
- None

## Soft warnings
- None

## Suggested fixes
- Route market parsing through `asMarketType(value, fallback)` and use MarketType label mappings in UX.
- Ensure all persisted leg/recommendation records include `marketType`.
- Remove nondeterministic snapshot behavior or introduce deterministic seed controls.
- Add prop workflow tests for fallback, matchup/injury note surfacing, and market-scoped persistence.

## PR-specific notes
- Deep scan applied to changed files (7) and canonical architecture files.

## Next Invariants
- Promote repeated warning signatures to hard rules if they recur over 3+ runs.

## CI Summary
- drift_score_total: 5
- hard_fail_count: 0
- warning_count: 0
- top_3_violations: none
- recommended_action: PASS
