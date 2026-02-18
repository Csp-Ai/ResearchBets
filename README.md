# ResearchBets

ResearchBets is a **copilot for player prop bettors**.

North Star: **Slip ingestion ➝ leg insights ➝ auto research ➝ risk framing** so bettors can move from noisy slips to confident, traceable decisions.

## Product Loop

1. Bettor uploads or pastes a slip.
2. System extracts each leg and normalizes the market via `MarketType`.
3. UI shows market-specific context (hit rate, matchup notes, injuries, trend, risk tags).
4. Snapshot pipeline produces recommendation evidence and reasoning for follow-through.

## Canonical Prop Architecture

`MarketType` is the canonical market enum used across ingestion, persistence, measurement, and UX.

- Ingestion parsing: `src/core/slips/extract.ts`
- Snapshot composition: `src/flows/researchSnapshot/buildResearchSnapshot.ts`
- Runtime persistence: `src/core/persistence/runtimeStore.ts`
- Recommendation measurement: `src/core/measurement/recommendations.ts`
- Market normalization source of truth: `src/core/markets/marketType.ts`

## Core Components

- **SlipIngestion**: capture raw slips + normalize markets.
- **SnapshotAgent**: produce deterministic research snapshots scoped by market.
- **Graph View**: trace runtime events and orchestration nodes.
- **SnapshotReplayView**: replay per-leg prop context (trend, matchup, injury, confidence) and parlay risk summary.
- **EvidenceDrawer**: inspect claims, evidence, and event-level detail.

## LLM / Copilot Primary Context Files

Keep these files clean and declarative; they are the highest-value context for Copilot/Codex:

- `src/core/markets/marketType.ts`
- `src/flows/researchSnapshot/buildResearchSnapshot.ts`
- `src/core/slips/extract.ts`
- `src/agents/researchSnapshot/ResearchSnapshotAgent.ts`

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Quality Gates

```bash
npm run lint
npm run typecheck
npm run test
```

## Research Path

Slip ingestion ➝ `buildPropLegInsight` leg context ➝ snapshot creation ➝ `/research/snapshot/[snapshotId]` replay via `SnapshotReplayView` ➝ trace replay graph (`?replay=1`).
