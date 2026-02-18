# ResearchBets Orchestrator Service (`services/orchestrator`)

## Responsibility
`services/orchestrator` is the ResearchBets intelligence coordination layer. It routes tasks to specialized agents, scores outputs, resolves conflicts, and returns unified recommendations.

## Interfaces
- Ingests normalized signals from `services/data-ingestion`.
- Uses shared contracts in `packages/agent-schemas` for agent input/output payloads.
- Publishes scored recommendations and rationale to `apps/web` and other UX surfaces.

## Ownership
- **Primary owner:** Intelligence Platform Team
- **Contributors:** Applied ML, Platform Reliability
