# LANDING_CONTRACT

## Proof-first rendering

- `/` must render headline + primary actions + a minimal Tonight's Board proof block in the first server response.
- If live feeds are unavailable, deterministic demo slate is rendered immediately.
- Never block the first proof render on client-only `useEffect` hydration.

## Mode contract

- User-visible output surfaces use a shared `ModeBadge` with three states:
  - `LIVE`
  - `CACHED`
  - `DEMO`
- Demo tooltip copy is canonical: **"Demo mode (live feeds off)"**.
- Landing and board surfaces derive mode from API provenance, not from raw env/runtime failures.

## Spine continuity contract

Every landing CTA/fetch preserves the spine:
- `sport`
- `tz`
- `date`
- `mode`
- `trace_id`

Rules:
- Use `nervous.toHref(...)` for route links.
- Use `appendQuery(...)` when adding non-spine params.
- Avoid brittle manual string query concatenation.

## API envelope contract (landing-adjacent endpoints)

Endpoints used by proof + ingest surfaces return one normalized envelope shape:

Success:

```json
{ "ok": true, "data": {"...": "..."}, "provenance": {"mode":"demo","generatedAt":"..."}, "trace_id": "..." }
```

Failure:

```json
{ "ok": false, "error": {"code":"...","message":"..."}, "trace_id": "..." }
```

Implemented for:
- `/api/today`
- `/api/slips/submit`
- `/api/slips/extract`

Adapters:
- `src/core/today/todayApiAdapter.ts`
- `src/core/slips/apiAdapters.ts`
