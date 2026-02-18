# Evidence Layer + Research Snapshot

ResearchBets now uses a receipts-first contract so every insight is traceable and explainable:

- **claim**: a concrete statement about the market/matchup
- **evidence**: timestamped receipts from providers
- **confidence**: deterministic score from explicit signals

## Contracts

Defined in `src/core/evidence/evidenceSchema.ts` and validated with Zod in `src/core/evidence/validators.ts`.

- `EvidenceItem`
  - source metadata (`sourceType`, `sourceName`, optional URL)
  - timing (`retrievedAt`, optional `observedAt`)
  - excerpt + optional raw payload
  - optional reliability and tags
- `Claim`
  - statement text
  - confidence (0 to 1)
  - rationale
  - evidence IDs backing that claim
- `ResearchReport`
  - report + runtime metadata (`reportId`, `runId`, `traceId`, `createdAt`)
  - subject key
  - claims + evidence arrays
  - summary, risks, assumptions

## Research Snapshot Flow

Entry point: `src/flows/researchSnapshot/buildResearchSnapshot.ts`

1. Fetches providers in parallel through the `SourceProvider` interface.
2. Normalizes and deduplicates evidence by `sourceType + contentExcerpt hash`.
3. Produces rule-based claims (line movement, injury impact, pace/efficiency mismatch).
4. Computes per-claim confidence with deterministic heuristics.
5. Assembles a `ResearchReport` containing runtime IDs (`runId`, `traceId`) for traceability.

Agent wrapper: `src/agents/researchSnapshot/ResearchSnapshotAgent.ts`.

## Confidence Weights

Defined in `src/core/evidence/confidence.ts`.

- `evidenceWeight = 0.2`
- `reliabilityWeight = 0.3`
- `recencyWeight = 0.2`
- `agreementWeight = 0.2`
- `consistencyWeight = 0.1`

Inputs:
- evidence count
- average source reliability
- recency in hours
- agreement score
- model self-consistency

Output is clamped to `[0, 1]` and rounded deterministically.

## Provider Interface and Extensibility

Interface in `src/core/sources/types.ts`:

- `id`
- `sourceType`
- `reliabilityDefault`
- `fetch(subject, options) => Promise<EvidenceItem[]>`

Current mock providers:
- `MockOddsProvider`
- `MockInjuryProvider`
- `MockStatsProvider`

To add a real provider later, implement `SourceProvider` and inject it into `buildResearchSnapshot` without changing report/claim logic.

## Persistence

- Interface: `src/core/persistence/reportStore.ts`
- Local: `MemoryReportStore`
- Supabase scaffold: `SupabaseReportStore` (env-gated, no required live creds)

## Why this differentiates ResearchBets

Sportsbooks optimize for execution and promotions; prediction markets optimize for price discovery and liquidity. ResearchBets now optimizes for **transparent reasoning**:

- every claim maps to explicit receipts
- every report is runtime-traceable via `runId/traceId`
- confidence is explainable, inspectable, and testable
- provider adapters are swappable without rewriting core research logic
