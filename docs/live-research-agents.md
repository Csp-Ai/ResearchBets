# Live Research Agents

This project supports source-stamped live research agents in the snapshot flow, with real provider adapters when server secrets are present and deterministic demo fallback when they are not.

## Required environment variables (server-only)

- `SPORTSDATAIO_API_KEY` (required for live stats)
- `ODDS_API_KEY` (required for live lines)
- `SPORTSDATAIO_BASE_URL` (optional override for dev/testing)
- `ODDS_API_BASE_URL` (optional override for dev/testing)

Do **not** expose provider keys via `NEXT_PUBLIC_*` variables.

## Coverage expectations

- Initial live coverage target is **NBA + NFL**.
- `StatsScout` computes `L5/L10` hit rates as primary signal, with season average as reference baseline.
- `OpponentContextScout` derives vs-opponent context from fetched logs (no extra endpoint required).
- `LineWatcher` maps Odds API books into platform line facts and computes consensus/divergence.

## Caching + rate limiting

All provider HTTP calls go through `fetchJsonWithCache` + token-bucket `rateLimit` with provenance stamps:

- SportsDataIO logs TTL: **6h**
- SportsDataIO season averages TTL: **24h**
- SportsDataIO vs-opponent slice TTL: **24h**
- Odds API TTL: **60s on game day**, otherwise **5m**

Snapshot pipeline pre-batches unique players/events and fetches provider payloads once per set to avoid per-leg request explosion.

## Missing keys / CI-safe behavior

When provider keys are missing:

- Registry falls back to deterministic demo providers.
- Snapshot build continues without throw.
- Scouts annotate `fallbackReason` + provenance so UI can explain degraded mode.
- Tests run without network/secrets by mocking provider fetch internals.
