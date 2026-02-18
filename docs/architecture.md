# Architecture

## System objective
ResearchBets is a decision-clarity system, not a prediction engine. The architecture is optimized for:

- structured extraction,
- factual verification,
- explicit assumption tracking,
- and post-game learning.

## Canonical runtime loop

1. Upload Slip
2. Extract
3. Verify Context
4. Identify Pattern
5. Surface Assumptions
6. Save
7. Post-Game Reflection

Features that do not reinforce this loop are out of MVP scope.

## Agent orchestration model

ResearchBets uses a **linear pipeline**:

`SlipRecognition -> ContextVerification -> PatternClassification -> Reflection`

Pipeline constraints:

- Every stage reads structured JSON and outputs structured JSON.
- Stages are append-only with respect to provenance (no rewriting upstream facts).
- Fact-bearing outputs must include evidence metadata (`claim`, `evidence`, `source_type`, `timestamp`, `confidence`).

## MVP boundaries

- **Sport:** NBA only.
- **Research UX:** available without mandatory authentication.
- **Persistence:** authentication required only for cross-session history.
- **No recommendation language:** avoid "good bet", "high probability", or "edge detected" claims.
