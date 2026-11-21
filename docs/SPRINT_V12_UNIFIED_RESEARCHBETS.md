# Sprint v1.2 — Unified ResearchBets integration (review candidate)

## Architecture and scope

Bender remains the parent website at `bender-one-nu.vercel.app`; Bitcoin and SPY retain their static frontend and local Vercel API functions. The ResearchBets Next.js application is mounted at `/research-bets` through a same-origin Vercel multi-zone reverse proxy. ResearchBets continues to own OCR, DraftSlipStore, Ticket X-Ray, risk and decision engines, history, market providers and account state. This is **not** a new independent research implementation and not an iframe or external browser handoff.

The ResearchBets preview branch sets `basePath: '/research-bets'` only on its explicitly targeted branch or when `RESEARCHBETS_BENDER_MOUNT=1`. This is required so `/_next` assets and native Next.js links resolve through the Bender path. The Bender integration branch pins its rewrite upstream to the exact ResearchBets preview deployment for commit `ac1d0c1f8f2bffba26302b2eb77c8f544aea8256`. **This is a review-only coupling**, not an approved production configuration. Repoint this destination to a stable, reachable, prefixed ResearchBets deployment before production.

## Implemented

- Screenshot-first first action links to native reviewed, multi-image upload, relying on the previous screenshot-integrity branch rather than a second uploader.
- Explore Today's Games retrieves the new schedule-only `/api/sports/slate` adapter for NBA, NFL, NHL, MLB and UFC. The adapter calls the existing canonical `getProviderRegistry().oddsProvider.fetchEvents` and does not require player-prop odds, model confidence or stats to load fixture metadata. Browser local timezone and local calendar date are passed explicitly; kickoff UTC timestamp is now preserved separately from existing localized display label.
- Only fresh provider-backed `mode=live`, `schedule_only` responses and same-local-date upcoming/started events are surfaced as verified fixtures. Cache/demo/unsupported statuses are not presented as live. Start time is not a verified in-progress game clock or final score, and the UI labels that uncertainty. Incomplete or unavailable provider coverage produces an explicit unavailable state.
- Existing NFL-only market-supported ideas remain connected to canonical DraftSlipStore and X-Ray. Other sports currently offer provider-backed game research **only**, not a priced multi-leg idea generator.
- Bender's static BTC/SPY assets and local APIs are not replaced. Legacy manual parlay math is not loaded by the new sports route.

## Remaining work and release gates

1. Vercel Git deployments are currently blocked by **`api-deployments-free-per-day` (HTTP 402, more than 100)**. The initial RB previews failed JSX quote lint; subsequent fixes have been pushed, but **cannot yet be verified by a new build**. GitHub Actions on the Bender branch has failed before runner assignment (0 steps), so neither full CI nor complete Next.js `npm run check` is established. The Vercel account owner must resolve the rate limit (plan/usage) or capacity must reset; GitHub Actions runner availability must also be restored.
2. Validate an independently deployable, publicly accessible ResearchBets zone for Bender before production. The current RB branch preview is protected by Vercel SSO, so unauthenticated Bender rewrite traffic may fail. A dedicated stable zone project with `RESEARCHBETS_BENDER_MOUNT=1` and reviewed environment credentials is recommended; do not disable all existing preview protection simply to work around it. Then verify Bender proxy routes, static Next.js assets, POST screenshot/parse APIs, session cookies, native navigation, and original BTC/SPY endpoints in a deployed preview. Verify the ResearchBets preview is accessible through the Bender reverse proxy despite deployment protection.
3. Exercise real anonymized FanDuel, DraftKings, Kalshi and PrizePicks multi-image screenshots, omitted-selection count guards, and correction-before-X-Ray. Test 390×844 and narrow mobile browsers.
4. Expand source-authorized league and market coverage, validated live status/scores (the existing `TodayGame` currently only supports upcoming/live), and multi-league idea generation through canonical X-Ray. Do not fabricate markets, quotes, or probabilities.
5. Provider licensing, injuries, rates and cache-freshness audits; no automated wagers. Existing screenshot draft PR must pass its own checks.
6. Production needs a stable paired Next.js deployment, full regression evidence and explicit release authorization. **NO-GO** on production while these items remain open.

The two integration branches intentionally target their respective already-open screenshot integrity branches as dependent review slices, rather than rewriting the main branch or merging unreviewed work.


## Independently verified at the latest code (2026-11-21)

- ResearchBets isolated Vercel sandbox: `npm ci`; **`npm run check` exit 0**, including lint, font/toHref/UI/convergence guards, `tsc --noEmit`, **773/773 Vitest tests (243 test files)**, and optimized Next.js production build. Existing stale review/build/Today tests were corrected against current product behavior; the 12 previously failing assertions were reproduced unchanged on the parent branch before corrections.
- Integration-zone build: `VERCEL_GIT_COMMIT_REF=feat/v12-unified-sports-entry-20261121 npm run build` exit 0; `.next/routes-manifest.json` reports **`basePath=/research-bets`**.
- Integration-zone runtime (with explicit `RESEARCHBETS_BENDER_MOUNT=1` at startup): `/` returned 404, `/research-bets` returned 200, `/research-bets/ingest` returned 200, `/research-bets/api/health` returned 200. `/research-bets/api/sports/slate?sport=NFL` returned 503 **as expected** because the isolated sandbox has no provider keys; no fabricated fixtures.
- Vercel project now has branch-scoped preview env `RESEARCHBETS_BENDER_MOUNT=1`. This setting must be present at both build and runtime. It does **not** change the standalone ResearchBets production project.
- Paired Bender isolated sandbox: **77/77 JavaScript tests**, **30/30 Python tests** (after declared dependencies installed), **5/5 headless Chromium viewport scenarios** and **7/7 browser fault scenarios**. These exercise existing Bender functionality with mock feeds, not deployed cross-zone auth/proxy operation.

**Release remains NO-GO:** official Vercel deployment/build API quota HTTP 402; protected branch-preview upstream cannot serve public Bender reverse-proxy traffic without a stable publicly accessible integration-zone deployment. Real screenshots, same-origin browser navigation/API POST/cookie preservation and physical iPhone QA still need release-candidate testing. Do not merge simply because sandbox tests passed.
