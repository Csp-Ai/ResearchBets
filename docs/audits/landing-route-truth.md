# Landing route truth (Phase 0)

## Canonical landing entry chain

- `/` resolves to `app/page.tsx`.
- `app/page.tsx` renders the proof-first SSR block (`BoardPreviewSSR`) first, then the interactive frontdoor (`FrontdoorLandingClient`), followed by compact BDA/credibility/trust modules.
- `FrontdoorLandingClient` owns the interactive board + slip rail fed by `/api/today`.

Related landing components present in repo:
- `src/components/landing/BoardPreviewSSR.tsx`
- `src/components/landing/FrontdoorLandingClient.tsx`
- `src/components/landing/LandingCompactModules.tsx`

Redirect behavior:
- `/landing` hard redirects to `/` via `app/landing/page.tsx`.

## Scary/system-state copy inventory

No exact "environment check failed" string is rendered on landing routes, but fallback/system phrasing appears in landing components:

- `src/components/landing/ModeBadge.tsx`: demo tooltip copy.
- `src/components/landing/LiveSnapshot.tsx`: mode line variants on legacy surfaces.
- `src/components/landing/useLandingTelemetry.ts`: internal fallback reason `telemetry_fetch_failed`.

These are the candidate sources to neutralize in later phases.

## Middleware/auth gate truth

- No project `middleware.ts`/`middleware.js` is present at repo root.
- Landing routes are not middleware-gated today.
- Protection is route-level where implemented (e.g., API auth checks in selected API routes).
