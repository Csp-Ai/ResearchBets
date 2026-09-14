# Routes and truth spine

## Canonical bettor loop

ResearchBets public truth is the narrow bettor loop:

`Discover + Build -> Ticket X-Ray -> Ticket Pulse -> Ticket Autopsy + Memory`

Canonical public routes:

- `/` — landing/front door
- `/stress-test` — Ticket X-Ray
- `/pulse` — Ticket Pulse
- `/review` — Ticket Autopsy + Memory

### Alternate entries during convergence

- `/today` — expanded board
- `/slip` — detailed manual ticket workbench
- `/ingest` — screenshot and pasted-slip ingestion

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
- `/live` — legacy live/control path; target is `/pulse`
- `/track` — legacy tracking path; target is `/pulse` after capability parity

### Dev-only / internal

- `/control`
- `/discover`
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
- `slip_id`
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
