# Live Research Agents

This project now supports source-stamped live research agents in the snapshot flow.

## Agents

- `StatsScout`: fetches `L5`, `L10`, and season baseline stats via swappable stats providers.
- `LineWatcher`: fetches platform line facts from FanDuel, PrizePicks, and Kalshi providers, then computes consensus + divergence.
- `OpponentContextScout`: adds vs-opponent context when the opponent can be resolved.
- `InjuryScout`: currently a stub that still emits provenance and `fallbackReason`.

## Provenance contract

Every fetched value is stored with:

- `asOf`
- `sources[]` (`provider`, `url`, `retrievedAt`)

Any missing source path must include `fallbackReason` so UI can explain degraded mode.

## Providers and config

Provider registry lives in `src/core/providers/registry.ts` and is app-agnostic.

- Stats providers are configured as `primary` + `fallback`.
- Line providers are configured independently per platform.
- If external providers require an API key, read keys server-side only and keep provider optional with fallback behavior for CI.

## Caching + rate limits

`src/core/sources/fetchJsonWithCache.ts` and `fetchHtmlWithCache.ts` support:

- Runtime store cache (`web_cache` records)
- Optional local filesystem cache in dev (`cacheDir`)
- TTL checks per URL + params
- Token-bucket rate limiting per source (`rateLimit.ts`)

This prevents repeated slip/snapshot runs from hammering upstreams.

## Snapshot wiring

`buildResearchSnapshot` now resolves legs from slip-like subject input and stores `legHitProfiles` with:

- hit-rate profile (L5/L10 primary, season baseline reference, optional vs-opponent)
- line context (platform lines, consensus line, divergence, warning)
- verdict + risk tag
- provenance and fallback reason

Replay UI renders these values in **Hit Profile** and **Line Context** sections and highlights the weakest leg.
