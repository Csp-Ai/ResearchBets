# Routes and truth spine

## Canonical route map

### BEFORE
- `/` (cockpit front door)
- `/today` (board)
- `/slip` (slip workbench)

### DURING
- `/stress-test`
- `/traces`

### AFTER
- `/control`
- `/review`

## Alias compatibility

- `/cockpit` -> canonical cockpit landing
- `/landing` -> compatibility redirect to canonical landing
- `/discover`, `/research`, `/live` -> canonical targets in product surfaces

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
