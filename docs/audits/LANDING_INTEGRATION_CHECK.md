# Landing Integration Check — Bettor-first TODAY flow

## What was broken

- **Continuity drops in landing CTAs**: multiple links used raw `href="/path"` values or brittle string concatenation (`${toHref(...)}&tab=...`), which risked dropping canonical spine context (`sport`, `tz`, `date`, `mode`, `gameId`, `propId`, `slipId`, `trace_id`).
- **Landing mode resolver mismatch**: landing mode detection only read `?demo=1` and ignored `?mode=demo`, creating incorrect labeling/fetch behavior for spine-driven URLs.
- **Tonight board fetch was not fully spine-aware**: board preview hook read params from `useSearchParams` directly and did not force deterministic demo fetch behavior from `mode=demo`.
- **Telemetry/today fetch omitted spine params**: landing telemetry hook fetched `/api/today` without carrying `sport/tz/date`, so the displayed board context could drift from the active nervous spine.
- **CSS sanity**: no breaking selector collision was found in landing vNext classes used by the updated landing shell; class references touched in this pass are present and aligned.

## What changed

- `src/components/landing/navigation.ts`
  - Added `appendQuery(href, params)` helper for safe query appends without malformed URLs.
- `src/components/landing/LandingPageClient.tsx`
  - Replaced ad-hoc query concatenation helper with shared `appendQuery`.
  - Updated Control Room CTA to use `appendQuery(nervous.toHref('/control'), { tab: 'live' })`.
  - Wired `useLandingTelemetry` to spine values (`sport`, `tz`, `date`) so landing telemetry/today data follows current context.
- `src/components/landing/BottomCTA.tsx`
  - Migrated all internal links to `nervous.toHref(...)`.
  - Added safe tab/query append flow through `appendQuery`.
  - Demo CTA now forces `mode: 'demo'` through nervous overrides while preserving the rest of the spine.
- `src/components/landing/TonightsBoardPreview.tsx`
  - Replaced brittle string concat with `appendQuery(nervous.toHref('/stress-test'), { tab: 'scout' })`.
- `src/components/landing/useTonightsBoard.ts`
  - Switched to `useNervousSystem()` as the source of truth for `sport/tz/date/mode`.
  - Added deterministic demo query behavior (`demo=1` when `mode=demo`) and aligned live-mode header handling.
- `src/components/landing/mode.ts`
  - Landing mode resolver now recognizes `?mode=demo` in addition to `?demo=1`.
- `src/components/landing/useLandingTelemetry.ts`
  - `/api/today` requests now include spine query params (`sport/tz/date`) and demo forcing when needed.

## Bettor “TODAY” acceptance checklist

- [x] **Default landing**: Tonight’s Board appears early, with clear primary action (`Analyze my slip`).
- [x] **Spine-preserving navigation**: nav + hero + bottom CTA links now route via `nervous.toHref(...)` and safe query append helper.
- [x] **Truthful mode/fallback messaging**: snapshot keeps calm fallback state (`Live requested — fallback applied`) and demo messaging when non-live paths are active.
- [x] **No malformed query appends**: landing uses URLSearchParams-based helper instead of manual `&tab=...` string concat.
- [x] **Compile/runtime checks**: lint, typecheck, and build pass in this repo environment (with one pre-existing lint warning outside landing scope).
