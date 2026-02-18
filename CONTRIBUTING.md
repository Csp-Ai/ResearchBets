# Contributing to ResearchBets

Thanks for contributing to ResearchBets.

## Prop-First Development Standard

ResearchBets is a decision engine for prop bettors. Any new ingestion, recommendation, or UI market logic must be **MarketType-first**.

## Required Rules

1. **Use `MarketType` + `asMarketType` for all market parsing/normalization.**
   - Do not hardcode ad-hoc market strings in slip logic, agent logic, or UI labels.
2. **Prop recommendations must be market-scoped.**
   - Ensure `marketType` flows leg ➝ snapshot ➝ recommendation persistence.
3. **UI renderers must map to canonical market labels.**
   - Example: points → PTS, threes → 3PM, ra → RA, pra → PRA.
4. **Fallback behavior is mandatory.**
   - If incoming market is missing/invalid, fallback with `asMarketType(value, 'points')` and keep behavior deterministic.

## Test Expectations for Prop Work

When changing prop-related features, include tests that validate:

- last-5 hit-rate surfaced or derived for the leg,
- matchup note present,
- injury note present,
- market fallback behavior for missing/invalid values,
- market-scoped snapshot/recommendation persistence.

## Recommended Context Files for Contributors and AI Coding Agents

Use these as your first-read files before editing prop workflows:

- `src/core/markets/marketType.ts`
- `src/flows/researchSnapshot/buildResearchSnapshot.ts`
- `src/core/slips/extract.ts`
- `src/agents/researchSnapshot/ResearchSnapshotAgent.ts`

