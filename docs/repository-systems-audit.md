# ResearchBets Repository Systems Audit

_Date:_ 2026-02-18  
_Scope:_ Current repository state focused on prop-first decision-engine readiness.

## Executive Summary

ResearchBets already has a recognizable end-to-end spine: slip ingestion APIs, market normalization primitives (`asMarketType`), snapshot generation (`buildResearchSnapshot`), runtime persistence abstraction (`RuntimeStore`), event telemetry (`DbEventEmitter`), and replay-oriented UI surfaces (`AgentNodeGraph`, `EvidenceDrawer`, `SnapshotReplayView`). The baseline architecture exists and is operational.

However, the implementation is not yet prop-first complete. The largest systemic gap is **MarketType integrity drift**: while the canonical enum supports nine market types (`spread/total/moneyline/points/threes/rebounds/assists/ra/pra`), multiple API schemas and Supabase DDL constraints still enforce only the legacy triad (`spread/total/moneyline`). This creates a hard contradiction between runtime code and persistence contracts.

Snapshot generation is partially deterministic (seeded confidence/evidence ordering intent), but not fully deterministic due to generated UUID report IDs and concurrent connector fetch order effects. Snapshot payloads are also claim-centric rather than leg-structured, so replay relies on heuristic claim parsing to reconstruct legs. Risk modeling is mostly heuristic and UI-oriented (risk tags, parlay correlation score), with no calibrated quantitative engine for volatility, injury instability, matchup variance decomposition, or fragility indexing.

Measurement and feedback loops exist for recommendations, outcomes, edge realization, and calibration events, but they are not market-type complete in storage contracts and are weakly tied to per-market calibration reporting. Agent attribution is present in event payloads and recommendation records, yet graph/node mapping depends on specific payload conventions and known-agent lists.

For VC-scale deployment, the system needs hardening in five dimensions: (1) unify MarketType contracts across API/schema/DB, (2) make snapshot artifacts deterministic and leg-native, (3) formalize risk-factor computation and persistence schema, (4) enforce measurement joins by marketType + agentVersion + trace lineage, and (5) reduce schema drift by consolidating Supabase DDL to a single authoritative migration path.

---

## 1) Architecture Mapping

### Agent entry points
- Agent registry currently includes `ExampleAgent` and `ResearchSnapshotAgent`; `ResearchOpsAgent` exports recommendations but is not registered as a runtime execution agent.  
  - `src/agents/index.ts`
  - `src/agents/example/ExampleAgent.ts`
  - `src/agents/researchSnapshot/ResearchSnapshotAgent.ts`
  - `src/agents/system/ResearchOpsAgent.ts`

### Flow orchestration layers
- API-triggered orchestration for snapshot generation happens in `POST /api/researchSnapshot/start` and calls `buildResearchSnapshot` directly with `DbEventEmitter` + runtime store.  
  - `app/api/researchSnapshot/start/route.ts`
  - `src/flows/researchSnapshot/buildResearchSnapshot.ts`
- Slip ingestion pipeline is split into `submit` (persist raw) and `extract` (parse legs + derive prop insights).  
  - `app/api/slips/submit/route.ts`
  - `app/api/slips/extract/route.ts`
  - `src/core/slips/extract.ts`
  - `src/core/slips/propInsights.ts`

### Ingestion → normalization → snapshot → persistence → replay path
1. **Slip ingest**: raw text persisted to `slip_submissions` via `createSlipSubmission`.  
2. **Leg extraction/normalization**: `extractLegs` parses line/JSON and normalizes market via `asMarketType(..., 'points')`.  
3. **Snapshot build**: connectors fetched, evidence sanitized/deduped, insights generated, claims built, recommendations logged, snapshot persisted.  
4. **Persistence**: writes through `RuntimeStore` abstraction (memory or Supabase).  
5. **Replay/UI**: `/research` loads trace events from `/api/events`; `/research/snapshot/[snapshotId]` loads stored snapshot and renders replay cards/graph/evidence.

### Event logging system
- Canonical event schema is `ControlPlaneEventSchema`; both in-memory and DB emitters validate events and metric requirements.  
  - `src/core/control-plane/events.ts`
  - `src/core/control-plane/emitter.ts`
- Event retrieval/write endpoint at `/api/events` backs replay UI polling.  
  - `app/api/events/route.ts`
  - `src/hooks/useTraceEvents.ts`

### Supabase integration surface
- Runtime persistence backend resolves to Supabase in production and by default in non-test unless explicitly overridden.  
  - `src/core/persistence/runtimeStoreProvider.ts`
- `SupabaseRuntimeStore` maps runtime entities to many tables (`research_reports`, `events_analytics`, `ai_recommendations`, `odds_snapshots`, etc.).  
  - `src/core/persistence/supabaseRuntimeStore.ts`
- Two separate schema files (`supabase/schema.sql` and `db/supabase/schema.sql`) define overlapping but divergent contracts.

### Text flow diagram
```
Client/UI
  ├─> POST /api/slips/submit
  │     ├─ RuntimeStore.createSlipSubmission
  │     └─ DbEventEmitter.emit('slip_submitted')
  ├─> POST /api/slips/extract
  │     ├─ RuntimeStore.getSlipSubmission
  │     ├─ extractLegs -> asMarketType
  │     ├─ buildPropLegInsight
  │     ├─ RuntimeStore.updateSlipSubmission
  │     └─ DbEventEmitter.emit('slip_extracted'|'slip_extract_failed')
  ├─> POST /api/researchSnapshot/start
  │     └─ buildResearchSnapshot
  │           ├─ ConnectorRegistry.resolve
  │           ├─ connector.fetch (parallel)
  │           ├─ evidence sanitize/dedupe
  │           ├─ insight graph nodes + RuntimeStore.saveInsightNode
  │           ├─ logAgentRecommendation/logFinalRecommendation
  │           ├─ RuntimeStore.saveSnapshot
  │           └─ event stream (started -> completed)
  ├─> GET /api/events?trace_id=...
  │     └─ RuntimeStore.listEvents
  └─> UI replay
        ├─ AgentNodeGraph (state reconstruction)
        ├─ EvidenceDrawer (payload provenance)
        └─ SnapshotReplayView (leg/risk rendering)
```

---

## 2) MarketType Integrity Audit

### Is `MarketType` single source of truth?
**No.** Runtime enum is canonical in TypeScript, but API validators and SQL constraints diverge.

### Hardcoded market strings found
- `createBetSchema` restricts `marketType` to `spread|total|moneyline` only.  
  - `app/api/bets/route.ts`
- odds refresh route casts `marketType` to legacy triad union.  
  - `app/api/odds/refresh/route.ts`
- Supabase DDL check constraints for `bets.market_type`, `ai_recommendations.market_type`, `odds_snapshots.market_type` still legacy triad in one schema file.  
  - `supabase/schema.sql`
- Regex parser in `extract.ts` duplicates market literals (includes all nine, but duplicated source).  
  - `src/core/slips/extract.ts`

### UI bypassing normalization?
- Partial bypass. Snapshot replay page infers market from claim text using string heuristics (`3pm/assist/rebound -> else points`) rather than using stored leg market metadata from snapshot schema. It re-normalizes afterward but source signal is heuristic text extraction.  
  - `app/research/snapshot/[snapshotId]/page.tsx`

### Fallback behavior coverage
- Strong usage of `asMarketType(..., fallback)` in extraction, snapshot start, agent input, prop insights.
- But fallback defaults are inconsistent (`points` in prop flows vs `spread` in WAL normalize), and some API contracts bypass enum by explicit unions.

### Snapshot/persistence guaranteed to store `marketType`?
- Recommendations, odds snapshots, and bets include `marketType` fields in runtime interfaces/store methods.
- Snapshot (`ResearchReport`) itself does **not** structurally carry leg-level `marketType`; only summary text/claims + evidence are stored.
- Replay endpoints reconstruct leg market from claim text, so marketType persistence is not guaranteed for replay.

### Violations list
1. `app/api/bets/route.ts`: API input schema restricts market type to 3 values, violating enum completeness.
2. `app/api/odds/refresh/route.ts`: request parameter cast to 3-value union.
3. `supabase/schema.sql`: DB check constraints restricted to 3 values for multiple tables.
4. `app/research/snapshot/[snapshotId]/page.tsx`: claim-text heuristic market inference.
5. `app/api/researchSnapshot/[id]/route.ts`: derives market as `asMarketType(claim.text, 'points')`, effectively always fallback for most claims.
6. `src/core/slips/extract.ts`: regex redefines market literals instead of deriving from enum list.

---

## 3) Snapshot Engine Evaluation

### Determinism
- **Partially deterministic**: seeded confidence hash logic and deterministic transformations exist.
- **Not fully deterministic** due to:
  - `reportId` from `randomUUID()`.
  - `Promise.all` parallel evidence collection can produce order variance unless connector order and push timing are stable.

### Leg-level insight schema included?
- Not in canonical snapshot payload (`ResearchReport`): no first-class legs array with per-leg structured diagnostics.
- Leg insights are generated in extract/replay layers, not persisted as canonical snapshot contract.

### Volatility representation
- Present as textual risk tag (`Low/Medium/High`) in prop insight/replay UI.
- Absent as numeric volatility factor in canonical snapshot schema.

### Confidence calibration
- Confidence is explicitly deterministic heuristic, not calibrated model output.

### Injury context integration
- Mostly textual (`injuryNote`, evidence excerpts, insight type classification), not structured injury factors with normalized fields/weights.

### Correlation across legs
- Implemented in parlay risk utility for UI (`same_team/same_game`, score/strength).
- Not integrated into snapshot core object persisted by `buildResearchSnapshot`.

### Readiness score: **5/10**
- Strong baseline plumbing.
- Missing deterministic artifact guarantees and leg-native risk schema.

---

## 4) Risk Modeling Gap Analysis

Current computed status:
- Volatility score: **No formal numeric engine** (only risk tags + heuristic labels).
- Injury instability factor: **No** (textual notes only).
- Matchup variance: **No formal metric** (text only).
- Correlation matrix across legs: **Partial** (pair detection + scalar score; no matrix persistence).
- Parlay fragility index: **No explicit index** (summary string and score only).
- Confidence calibration over time: **Partial global calibration** exists via edge records; not market/agent-segmented.

Recommended insertion points:
1. **`buildResearchSnapshot`**: compute and persist `riskFactors` object at leg and portfolio scope.
2. **`ResearchReport` schema**: add `legs[]` with structured fields (`marketType`, line, volatility, injuryFactor, matchupVariance, correlationRefs).
3. **`RuntimeStore.saveSnapshot` + DB table**: persist normalized risk vectors (JSONB or dedicated table).
4. **`recommendations.ts`**: include calibrated confidence and calibration bucket metadata in `evidenceRefs` or first-class columns.
5. **Settlement/calibration jobs**: backfill realized outcomes keyed by marketType for calibration curves per market.

---

## 5) Measurement & Feedback Loop Audit

### Recommendation storage
- Recommendations stored with lineage (`traceId`, `runId`, parent/group ids, agent id/version, marketType, rationale/evidence refs).
- Agent and final recommendations both persisted and emitted as `agent_scored_decision` events.

### Market-scoped performance metrics
- Not robustly enforced end-to-end due to triad market constraints in API/DDL and lack of marketType-centric aggregation jobs.

### Confidence calibration measurability
- Calibration exists from edge-realized records; emits `calibration_update` and persists insight node.
- Lacks explicit joins back to recommendation marketType/agentVersion in calibration output schema.

### Accuracy tied to marketType
- Settlement logic uses marketType for outcome calculation in bets/recommendations, but analytics summarization by marketType is not centralized.

### Agent attribution/logging
- Event and recommendation records include agent id/version and trace/run lineage.
- Replay graph uses known agent IDs and payload conventions; unknown agents may be underrepresented.

---

## 6) UI Structural Review

### SnapshotReplayView completeness
- Good presentational leg cards, risk badges, trend bars, correlation callouts, alt-leg suggestions.
- Depends on inferred or synthetic leg metadata when snapshot lacks structural legs.

### EvidenceDrawer trace fidelity
- Shows event payload fields/provenance tabs and recent events.
- Fidelity depends on event payload consistency (`payload` vs `properties` mapping) and node-event matching heuristics.

### GraphView (AgentNodeGraph)
- Currently best interpreted as **power-user/dev observability tool**, not full user intelligence layer.
- Hardcoded known agents and event-node mappings reduce extensibility.

### Is risk visually surfaced?
- Surfaced in replay card badges/callouts, but mostly heuristic and textual; no explicit quantitative risk dashboard.

---

## 7) Technical Risk & Scalability

1. **Sync/blocking patterns**
   - `ResearchOpsAgent` uses `execSync` and sync FS calls (`readFileSync/readdirSync`) which can block if invoked in request path.
2. **Supabase schema drift risk (high)**
   - Two SQL schema files with overlapping table definitions and inconsistent market constraints.
3. **Type enforcement gaps**
   - Runtime `MarketType` supports 9 values; API and SQL often enforce 3.
4. **Test coverage gaps**
   - Determinism test checks evidence hashes only, not full snapshot object determinism.
   - Limited explicit tests for full marketType propagation through APIs/DB contracts.
5. **Inconsistent env/backend behavior**
   - Default non-test backend resolves to Supabase unless `DEV_PERSISTENCE_BACKEND=memory`; local runs can unexpectedly require Supabase credentials.
6. **CI/CD integrity limitations**
   - CI validates schemas/services/docs, but does not run full root test/typecheck/lint workflow for app runtime in this workflow file.

---

## 8) Architectural Drift Detection

- **Duplicate prop logic**: market heuristics duplicated across `extract`, replay parsing, parlay utilities, and API schemas.
- **Multiple sources of truth**: `MarketType` enum vs route Zod enums vs SQL check constraints.
- **Normalization leaks**: claim-text-to-market inference in replay path.
- **Agent responsibility overlap**: snapshot flow both generates insights and recommendation logs; separate measurement modules also generate insight nodes, blurring boundaries between analysis and telemetry layers.

---

## 9) Prop-First Compliance Score (1–10)

- Ingestion discipline: **7/10**
- Snapshot integrity: **5/10**
- Market normalization: **4/10**
- Measurement clarity: **6/10**
- Risk framing maturity: **4/10**

**Composite prop-first compliance score: 5.2/10**

---

## 10) Immediate High-Leverage Refactors (Top 5)

1. **Unify MarketType contract generation (highest leverage)**
   - Export enum-derived Zod schema and SQL migration source from one module; remove hand-coded triad enums/checks.
2. **Promote leg-native snapshot schema**
   - Add `legs[]` + `legInsights[]` + `riskFactors` into `ResearchReport` and persist directly; eliminate claim-text parsing fallback.
3. **Deterministic snapshot mode**
   - Stable report IDs (hash-based), deterministic connector evidence ordering, and deterministic serialization for replay integrity.
4. **Risk vector engine**
   - Introduce numeric factors (`volatility`, `injuryInstability`, `matchupVariance`, `correlationImpact`, `fragilityIndex`) with explicit storage and UI rendering.
5. **Schema/migration consolidation + CI enforcement**
   - Collapse dual Supabase schema files into versioned migrations and add CI checks ensuring runtime interfaces match DB constraints.

---

## Readiness Score for VC-Scale Deployment

**Overall readiness: 4.8/10**

Rationale: strong scaffolding and observability primitives exist, but market-contract inconsistency and snapshot/risk schema incompleteness present material correctness and scaling risk for a production prop-first decision engine.
