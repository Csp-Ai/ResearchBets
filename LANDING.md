# Landing page architecture

## Component map

Landing page route is served from `/` via `app/page.tsx` and composed by `src/components/landing/LandingPageClient.tsx`.

- `Hero` (client): hero text, personalized return line, mini simulation canvas.
- `ProofStrip` (server): marquee proof chips.
- `StatsBar` (client): intersection-triggered counter animation.
- `LiveSnapshot` (client): demo/live status label and featured game snapshot.
- `RiskGauge` (client): gauge canvas and per-leg hover context.
- `OddsMovement` (client): odds tabs and animated chart canvas.
- `Tracker` (client): demo pipeline trace and event feed.
- `Pillars`, `VerdictMock`, `NotSection`, `FAQ`, `BottomCTA`, `Footer` (server/static).

All landing styles live in `src/components/landing/landing.module.css`.

## Demo/live mode

- Demo mode is default.
- Add `?live=1` on `/` to set UI mode to live.
- Query parsing is in `src/components/landing/mode.ts`.

## Future wiring

`src/core/landing/live.ts` exposes `fetchLandingSnapshot(mode)` as the integration point for provider-backed landing data.

For real traces, wire `Tracker` to `/api/events` and `/api/slips/*` run IDs, replacing in-component demo constants.
