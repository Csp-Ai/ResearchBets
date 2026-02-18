# ResearchBets Data Ingestion Service (`services/data-ingestion`)

## Responsibility
`services/data-ingestion` manages upstream pipelines for odds, injuries, weather, and line-movement feeds. It validates, normalizes, and timestamps raw provider data before downstream consumption.

## Interfaces
- Pulls from external sportsbook, injury, weather, and market-data providers.
- Emits normalized records consumed by `services/orchestrator`.
- Shares canonical domain models through `packages/shared-types`.

## Ownership
- **Primary owner:** Data Platform Team
- **Contributors:** Reliability Engineering, Provider Integrations
