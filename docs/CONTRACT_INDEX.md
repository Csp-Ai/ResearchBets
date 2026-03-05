# Contract Index

## Spine contract
- **Definition**: `src/core/nervous/spine.ts`
  - Fields: `trace_id?`, `sport`, `tz`, `date`, `mode`, `tab?`
  - Schema: `SpineSchema`
  - Helpers: `normalizeSpine`, `parseSpineFromSearch`, `serializeSpine`, `SPINE_KEYS`
- **Routing writer**: `src/core/nervous/routes.ts` → `toHref`
- **Trace helper**: `src/core/trace/queryTrace.ts` → `withTraceId`, `getQueryTraceId`
- **Server context bridge**: `src/core/contracts/contextSpine.ts` (`spineFromRequest`, `spineToQuery`)

## Env contract
- **Canonical keys**: `src/core/env/keys.ts` (`CANONICAL_KEYS`)
- **Alias keys**: `src/core/env/keys.ts` (`ALIAS_KEYS`)
- **Read/resolve helpers**: `src/core/env/read.server.ts` (`readString`, `readBool`, `resolveWithAliases`)
- **Runtime flags**: `src/core/env/runtime.server.ts` (`runtimeFlags`)
- **Drift test**: `tests/envKeyDrift.test.ts`

## Zod envelopes / DTO schemas
- **Event envelope**: `src/core/contracts/envelopes.ts` → `EventEnvelopeSchema`
- **Today payload envelope**: `src/core/contracts/envelopes.ts` → `TodayPayloadSchema`
- **Governor report**: `src/core/contracts/envelopes.ts` → `GovernorReportSchema`
- **Control-plane event**: `src/core/control-plane/events.ts` → `ControlPlaneEventSchema`
- **Terminal entities**: `src/core/contracts/terminalSchemas.ts` (`BetSchema`, `TrackedBetSchema`, etc.)

## Today contract
- **Domain types**: `src/core/today/types.ts` (`TodayPayload`, `TodayProvenance`, board/game/prop types)
- **Service producer**: `src/core/today/service.server.ts` (`resolveTodayTruth`, `selectBoardViewFromToday`)
- **API parser adapter**: `src/core/today/todayApiAdapter.ts` (`parseTodayEnvelope`)

## Run / Trace / Slip contracts
- **Run DTO**: `src/core/run/researchRunDTO.ts` (`ResearchRunDTO`, provenance mapping)
- **Run types**: `src/core/run/types.ts`
- **Slip structure report**: `src/core/contracts/slipStructureReport` (consumed by run DTO)
- **Trace metadata**: `src/core/contracts/trace.ts` (`ensureTraceMeta`)
- **Slip extraction/submit envelopes**: `src/core/contracts/envelopes.ts` + `app/api/slips/*`

## Persistence DTO surface
- **Runtime store interfaces**: `src/core/persistence/runtimeStore.ts`
- **Supabase implementation + table map**: `src/core/persistence/supabaseRuntimeStore.ts`
- **Backend switch**: `src/core/persistence/runtimeStoreProvider.ts`
