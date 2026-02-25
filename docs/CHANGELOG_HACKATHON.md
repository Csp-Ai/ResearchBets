# Hackathon Changelog (Lifecycle Sprint)

## Shipped in this sprint

- Introduced canonical bettor lifecycle routes:
  - `/` (Board), `/slip`, `/stress-test`, `/control`
  - legacy aliases kept via redirects (`/discover`, `/research`, `/live`).
- Added/standardized draft slip lifecycle state with `DraftSlipStore` + `useDraftSlip`.
- Upgraded today board flow with `/api/today` aggregation and deterministic demo fallback.
- Fixed `/control` rendering path by wrapping the page in Suspense with a loading fallback.
- Added slip intelligence engine (`computeSlipIntelligence`) and in-product `SlipIntelBar` surface.
- Added deterministic postmortem API (`/api/postmortem`) for review classification.
- Hardened offline/demo mode env gating via strict-vs-relaxed behavior in `scripts/env-check.mjs`.

## Why this matters

The product now reads as a coherent bettor lifecycle OS: discover → build → test → monitor → review.
