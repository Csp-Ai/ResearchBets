# ResearchBets Agent Schemas (`packages/agent-schemas`)

## Responsibility
`packages/agent-schemas` defines versioned contracts for the MVP research pipeline:

- SlipRecognition
- ContextVerification
- PatternClassification
- Reflection

## Contract rules
- All agent stages consume and produce JSON payloads.
- Upstream factual records are immutable once emitted.
- Evidence-bearing outputs should include:
  - `claim`
  - `evidence`
  - `source_type`
  - `timestamp`
  - `confidence`

## Interfaces
- Imported by `services/orchestrator` for pipeline routing and validation.
- Referenced by runtime and web layers for typed interactions with research artifacts.

## Ownership
- **Primary owner:** Platform Contracts Team
- **Contributors:** Intelligence Platform, Web Platform
