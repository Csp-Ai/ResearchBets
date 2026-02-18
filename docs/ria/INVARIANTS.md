# RIA Invariants

## Hard Rules (merge-blocking)
- H1: No ad-hoc market strings used in parsing/logic where `MarketType` should be used.
- H2: `marketType` must exist in persisted leg/snapshot/recommendation records.
- H3: No nondeterministic snapshot behavior (`Date.now`, `Math.random`) unless explicitly whitelisted.
- H4: Missing/invalid market inputs must use explicit fallback behavior (`asMarketType(value, default)`).

## Soft Warnings (non-blocking unless drift threshold is exceeded)
- S1: Avoid duplicated prop tag/risk/label logic in UI components.
- S2: Prop workflow changes should update tests.
- S3: UI should use canonical prop insight builder flows.
- S4: Evidence claims should be backed by trace events/citations.
