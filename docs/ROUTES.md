# Routes and truth spine

## Canonical bettor loop

ResearchBets public truth is the narrow bettor loop:

`landing -> today/board -> slip -> stress-test -> track -> review`

Canonical public routes:

- `/` — landing/front door
- `/today` — board
- `/slip` — slip workbench
- `/stress-test` — run analysis
- `/track` — during-stage tracking
- `/review` — after-stage review

## Route classification

### Canonical

- `/`
- `/today`
- `/slip`
- `/stress-test`
- `/track`
- `/review`

### Redirect-only compatibility

- `/cockpit` -> `/`
- `/landing` -> `/`
- `/research` -> `/stress-test`
- `/live` -> `/control?tab=live`

### Dev-only / internal

- `/control`
- `/discover`
- `/ingest`
- `/dashboard`
- `/tonight`
- `/history`
- `/community`
- `/profile`
- `/journal`
- `/pending-bets`
- `/settings`
- `/traces`
- `/dev/*`

## Truth spine query contract

All navigation should preserve:

- `trace_id`
- `sport`
- `tz`
- `date`
- `mode`
- `tab` (if page-specific)

Authoritative helpers:

- `src/core/nervous/spine.ts`
- `src/core/nervous/routes.ts`
- `toHref`
- `spineHref`
- `appendQuery`
- `spineFetch`

## UI mode contract

UI mode badges and labels must follow API payload mode/provenance (`TodayPayload.mode` + provenance), never local override heuristics.
