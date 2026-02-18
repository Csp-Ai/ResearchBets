# ResearchBets Web App (`apps/web`)

## Responsibility
`apps/web` contains the ResearchBets frontend UX shell. This layer provides user-facing pages, dashboards, and interactions for exploring signals, recommendations, and confidence context.

## Interfaces
- Consumes orchestrated recommendation and explanation APIs from `services/orchestrator`.
- Reads normalized domain objects defined in `packages/shared-types`.
- Uses request/response contracts from `packages/agent-schemas` when calling intelligence endpoints.

## Ownership
- **Primary owner:** Product Engineering (Web)
- **Contributors:** Design Systems, Platform API integrators
