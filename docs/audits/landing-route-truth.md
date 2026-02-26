# Landing route truth (Phase 0)

## Canonical landing entry chain

- `/` resolves to `app/page.tsx`.
- `app/page.tsx` renders `app/HomeLandingClient.tsx` inside `Suspense`.
- `app/HomeLandingClient.tsx` renders `FrontdoorLandingClient` from `src/components/landing/FrontdoorLandingClient.tsx`.
- This frontdoor surface currently owns the "Tonight's Board" proof cards and primary betting CTAs.

Related landing components present in repo:
- `src/components/landing/FrontdoorLandingClient.tsx`
- `src/components/landing/HomeLandingPage.tsx`
- `src/components/landing/LandingPageClient.tsx`
- `src/components/landing/TonightsBoardPreview.tsx`
- `src/components/landing/LandingVisionClient.tsx` (if used by future route wiring)

Additional marketing route chain:
- `/landing` -> `app/landing/page.tsx` -> `app/landing/LandingMarketingClient.tsx` -> `HomeLandingPage`.

## Scary/system-state copy inventory

No exact "environment check failed" string is rendered on landing routes, but fallback/system phrasing appears in landing components:

- `src/components/landing/ModeBadge.tsx`: "Live requested — fallback applied (...)"
- `src/components/landing/LiveSnapshot.tsx`: "Live requested — fallback applied" and mode line variants.
- `src/components/landing/useLandingTelemetry.ts`: internal fallback reason `telemetry_fetch_failed`.

These are the candidate sources to neutralize in later phases.

## Middleware/auth gate truth

- No project `middleware.ts`/`middleware.js` is present at repo root.
- Landing routes are not middleware-gated today.
- Protection is route-level where implemented (e.g., API auth checks in selected API routes).
