# ResearchBets Agent Schemas (`packages/agent-schemas`)

## Responsibility
`packages/agent-schemas` defines versioned shared contracts for agent prompts, context payloads, tool calls, intermediate results, and final responses.

## Interfaces
- Imported by `services/orchestrator` for routing and scoring workflows.
- Referenced by `apps/web` for typed API interactions with intelligence endpoints.
- Coordinated with `packages/shared-types` for domain-level consistency.

## Ownership
- **Primary owner:** Platform Contracts Team
- **Contributors:** Intelligence Platform, Web Platform
