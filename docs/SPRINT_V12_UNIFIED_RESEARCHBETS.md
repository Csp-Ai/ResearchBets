# Sprint v1.2 — Unified ResearchBets integration (review candidate)

## Architecture and scope

Bender remains the parent website at `bender-one-nu.vercel.app`; Bitcoin and SPY retain their static frontend and local Vercel API functions. The ResearchBets Next.js application is mounted at `/research-bets` through a same-origin Vercel multi-zone reverse proxy. ResearchBets continues to own OCR, DraftSlipStore, Ticket X-Ray, risk and decision engines, history, market providers and account state. This is **not** a new independent research implementation and not an iframe or external browser handoff.

The ResearchBets preview branch sets `basePath: '/research-bets'` only on its explicitly targeted branch or when `RESEARCHBETS_BENDER_MOUNT=1`. This is required so `/_next` assets and native Next.js links resolve through the Bender path. The Bender integration branch pins its rewrite upstream to the exact ResearchBets preview deployment for commit `ac1d0c1f8f2bffba26302b2eb77c8f544aea8256`. **This is a review-only coupling**, not an approved production configuration. Repoint this destination to a stable, reachable, prefixed ResearchBets deployment before production.

## Implemented

- Screenshot-first first action links to native reviewed, multi-image upload, relying on the previous screenshot-integrity branch rather than a second uploader.
- Explore Today's Games retrieves existing canonical `/api/today` data for NBA, NFL, NHL, MLB and UFC. Browser local timezone and local calendar date are passed explicitly; kickoff UTC timestamp is now preserved separately from existing localized display label.
- Only fresh provider-backed `mode=live` responses and same-local-date upcoming/live events are surfaced as verified. Cache/demo/unsupported statuses are not presented as live. Incomplete or unavailable provider coverage produces an explicit unavailable state.
- Existing NFL-only market-supported ideas remain connected to canonical DraftSlipStore and X-Ray. Other sports currently offer provider-backed game research **only**, not a priced multi-leg idea generator.
- Bender's static BTC/SPY assets and local APIs are not replaced. Legacy manual parlay math is not loaded by the new sports route.

## Remaining work and release gates

1. Run real Vercel build and linked automated test suite for both repos. CI success and complete Next.js `npm run check` are not established by an unverified preview.
2. Verify Bender proxy routes, static Next.js assets, POST screenshot/parse APIs, session cookies, native navigation, and original BTC/SPY endpoints in a deployed preview. Verify the ResearchBets preview is accessible through the Bender reverse proxy despite deployment protection.
3. Exercise real anonymized FanDuel, DraftKings, Kalshi and PrizePicks multi-image screenshots, omitted-selection count guards, and correction-before-X-Ray. Test 390×844 and narrow mobile browsers.
4. Expand source-authorized league and market coverage, validated live status/scores (the existing `TodayGame` currently only supports upcoming/live), and multi-league idea generation through canonical X-Ray. Do not fabricate markets, quotes, or probabilities.
5. Provider licensing, injuries, rates and cache-freshness audits; no automated wagers. Existing screenshot draft PR must pass its own checks.
6. Production needs a stable paired Next.js deployment, full regression evidence and explicit release authorization. **NO-GO** on production while these items remain open.

The two integration branches intentionally target their respective already-open screenshot integrity branches as dependent review slices, rather than rewriting the main branch or merging unreviewed work.
