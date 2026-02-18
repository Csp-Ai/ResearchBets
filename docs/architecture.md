# ResearchBets Architecture

This document defines the initial ResearchBets platform layering model and module-to-module flow.

## Layer 1: Data Layer

### Modules
- `services/data-ingestion`
- `packages/shared-types`

### Responsibilities
- Acquire raw source data (odds, injuries, weather, line movement).
- Validate, normalize, and enrich records with canonical identifiers and timestamps.
- Publish consistent domain entities to downstream consumers.

### Outputs
- Normalized market and context datasets typed via `packages/shared-types`.

## Layer 2: Intelligence Layer

### Modules
- `services/orchestrator`
- `packages/agent-schemas`
- `packages/shared-types`

### Responsibilities
- Route intelligence tasks across specialized agents.
- Score, rank, and reconcile candidate recommendations.
- Enforce schema contracts for all agent inputs/outputs and decision artifacts.

### Outputs
- Structured recommendations, confidence scores, and rationale payloads.

## Layer 3: User and UX Surfaces

### Modules
- `apps/web`

### Responsibilities
- Present ResearchBets recommendations and supporting context.
- Provide user-facing workflows for reviewing insights and outcomes.
- Display confidence, explainability, and market movement narratives.

### Outputs
- Human-consumable interfaces and interaction telemetry.

## End-to-End Data Flow

1. `services/data-ingestion` collects and normalizes provider inputs.
2. Normalized entities are represented with `packages/shared-types`.
3. `services/orchestrator` consumes Layer 1 outputs and uses `packages/agent-schemas` to coordinate agent execution.
4. Orchestrator emits scored recommendation payloads that align with shared domain models.
5. `apps/web` consumes those payloads and renders Layer 3 user experiences.

## Branding and Naming Standard

All modules, documentation, and references in this repository use **ResearchBets** naming. Legacy **EdgePicks** naming is not used in folder structure or architecture definitions.
