# Landing Contract

## Canonical route and aliases

- Canonical home landing route is `/`.
- `/cockpit` is a route alias that must render the same landing composition (thin wrapper only).
- `/landing` is a compatibility alias and should redirect to `/` while preserving query context.

## Composition contract

- Above the fold must include:
  - **Tonight's Board Preview**
  - primary CTA into board/slip flow
  - secondary CTA into ingest/analyze flow
- Board preview component lives at `src/components/landing/BoardPreview.server.tsx`.
- Landing composition should be shared so `/` and `/cockpit` do not drift.

## Today pipeline rule (no duplication)

Landing preview data must reuse Today truth pipeline:

1. `resolveTodayTruth` in `src/core/today/service.server.ts`
2. `buildCanonicalBoard` / board model in `src/core/today/boardModel.ts`

Do not add a separate landing-only slate fetcher or ranking path.

## Truth spine + trace continuity

- Normalize incoming context with `normalizeSpine`.
- Preserve trace from API boundaries with `getTraceContext` and Zod envelopes.
- Keep query precedence deterministic: explicit query > normalized defaults.
- Build links with nervous/router helpers:
  - `nervous.toHref(...)`
  - `appendQuery(...)`
  - `withTraceId(...)`

## Copy contract

- Use neutral system status language for mode/freshness state.
- Never render `demo`, `beta`, `prototype`, or `experimental` wording in landing UI copy.

## Flow map

- `/` (landing)
  - -> `/today`
  - -> `/slip` or `/ingest`
  - -> `/analyze` (`/stress-test?tab=analyze`)
  - -> `/track`
  - -> `/traces/[trace_id]`
