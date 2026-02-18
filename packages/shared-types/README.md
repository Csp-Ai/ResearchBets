# ResearchBets Shared Types (`packages/shared-types`)

## Responsibility
`packages/shared-types` contains cross-service ResearchBets domain types such as events, teams, markets, bets, risk metadata, and recommendation summaries.

## Interfaces
- Used by `services/data-ingestion` for normalized data representations.
- Used by `services/orchestrator` for internal scoring and output composition.
- Used by `apps/web` to render typed views and maintain client/server consistency.

## Ownership
- **Primary owner:** Core Domain Team
- **Contributors:** All service owners
