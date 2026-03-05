# Troubleshooting

## Runtime mode precedence

1. Explicit URL intent first (`mode=demo|live`, with `demo=1` compatibility).
2. If not explicit, provider health + runtime resolver decide.
3. `/api/today` payload mode/provenance is authoritative for UI display.

## Provider probing endpoints

- `/api/env/status`: high-level env readiness.
- `/api/provider-health`: sanitized provider checks, reasons, and mode context.
- `/api/odds/probe`: sanitized upstream reachability diagnostics.

## Typed provider HTTP errors

Source contract: `src/core/providers/theoddsapi.ts`.

`ProviderHttpError` includes:

- `status` / `statusCode`
- `url`
- `provider`
- `host`
- `bodyExcerpt`

Message pattern is sanitized as:

- `odds_http_<status>`

Errors propagate as sanitized warnings to today fallback diagnostics (for example `events_fetch_status`, `events_fetch_host`) without leaking secrets/raw bodies.

## Common user-safe signatures

| Signature | Meaning | Typical behavior |
|---|---|---|
| 401 / 403 | Key invalid, missing auth, or plan restriction | live path may degrade/fallback |
| 429 | Upstream rate limiting | cache fallback may activate |
| timeout / DNS / TLS | Provider temporarily unreachable | degraded checks and fallback behavior |

## Related docs

- Route + spine continuity: [ROUTES.md](./ROUTES.md)
- API inventory: [APIS.md](./APIS.md)
