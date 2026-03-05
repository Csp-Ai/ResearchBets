# API inventory (minimal)

## Core endpoints

- `GET /api/today` — today slate contract for landing/cockpit (`mode`, provenance, games/board, landing summary).
  - Source: `app/api/today/route.ts`
- `GET /api/provider-health` — provider readiness checks + runtime mode context with sanitized reasons.
  - Source: `app/api/provider-health/route.ts`
- `GET /api/odds/probe` — sanitized provider reachability diagnostics.
  - Source: `app/api/odds/probe/route.ts`

## Intelligence endpoints

- `GET /api/events` — event stream lifecycle envelope.
  - Source: `app/api/events/route.ts`
- `POST /api/slips/submit` — slip submission intake.
  - Source: `app/api/slips/submit/route.ts`
- `POST /api/slips/extract` — extraction/leg parse path.
  - Source: `app/api/slips/extract/route.ts`
- `POST /api/postmortem` — deterministic postmortem classifier.
  - Source: `app/api/postmortem/route.ts`

Keep endpoint docs concise here; put deep shape details in feature docs when needed.
