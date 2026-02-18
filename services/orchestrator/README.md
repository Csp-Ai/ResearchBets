# ResearchBets Orchestrator Service (`services/orchestrator`)

## Responsibility
`services/orchestrator` coordinates a deterministic research pipeline for MVP:

1. SlipRecognition
2. ContextVerification
3. PatternClassification
4. Reflection (post-game)

The service is intentionally pipeline-based and avoids unrestricted multi-agent cross-talk.

## Interfaces
- Ingests normalized slip input from app/services layers.
- Uses shared contracts in `packages/agent-schemas` for stage I/O payloads.
- Emits ordered research artifacts (facts, context, patterns, assumptions, reflection).

## Operating constraints
- Downstream stages cannot rewrite upstream factual outputs.
- Fact-bearing records must include evidence metadata and timestamps.
- No prediction/advice generation in MVP orchestration responses.

## Ownership
- **Primary owner:** Intelligence Platform Team
- **Contributors:** Applied ML, Platform Reliability
