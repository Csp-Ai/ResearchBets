# Shared Chunk Owners Audit

Generated: 2026-03-01T04:36:39.119Z

- Routes observed: **39**
- App routes observed: **37**
- Pages-manifest routes observed: **2**

## Target chunk ownership

### fd9d1056
- Chunk files: static/chunks/fd9d1056-a81371f087f4d64b.js
- Route owners: **37/39** (94.9%)
- Top owners:
  - /(home)/page
  - /(product)/agents/page
  - /(product)/bettor-os/page
  - /(product)/community/page
  - /(product)/control/page
  - /(product)/dashboard/page
  - /(product)/dev/dashboard/page
  - /(product)/dev/governor/page
  - /(product)/dev/mirror/page
  - /(product)/discover/page
  - /(product)/game/[gameId]/page
  - /(product)/history/page
  - /(product)/ingest/page
  - /(product)/journal/[entryId]/page
  - /(product)/journal/page

### 2117
- Chunk files: static/chunks/2117-830198a307f2900b.js
- Route owners: **37/39** (94.9%)
- Top owners:
  - /(home)/page
  - /(product)/agents/page
  - /(product)/bettor-os/page
  - /(product)/community/page
  - /(product)/control/page
  - /(product)/dashboard/page
  - /(product)/dev/dashboard/page
  - /(product)/dev/governor/page
  - /(product)/dev/mirror/page
  - /(product)/discover/page
  - /(product)/game/[gameId]/page
  - /(product)/history/page
  - /(product)/ingest/page
  - /(product)/journal/[entryId]/page
  - /(product)/journal/page

## Common chunk set across all observed routes

- static/chunks/webpack-c89ccf645ad3d101.js

## Near-universal chunks (>=90% of routes)

- static/chunks/webpack-c89ccf645ad3d101.js — 39/39 routes (100.0%)
- static/chunks/2117-830198a307f2900b.js — 37/39 routes (94.9%)
- static/chunks/fd9d1056-a81371f087f4d64b.js — 37/39 routes (94.9%)
- static/chunks/main-app-4c39b7983b4d92e3.js — 37/39 routes (94.9%)

## Universal root-cause guess

- app/layout.tsx (and Next app runtime) appears in all target chunk owner sets via /layout route entry.
- Target-owner intersection size: 37
- Shared route segments in target-owner intersection:
  - page: 35
  - (product): 34
  - dev: 3
  - dashboard: 2
  - [gameId]: 2
  - journal: 2
  - layout: 2
  - live: 2
  - research: 2
  - traces: 2

JSON report: `docs/audit/shared-chunk-owners.json`

## Refactor applied from this audit

- Moved the product-shell client boundary out of `app/(product)/ProductShell.tsx` and into a new `app/(product)/ProductShellClient.tsx`, so the `(product)` layout now imports a server wrapper that lazy-loads the client shell only at runtime.
- This keeps `NervousSystemProvider` + `AppShellProduct` off the server layout module graph and tightens route-boundary ownership for product-only client concerns.
- Build output remained at 87.7kB shared JS after this split, indicating the tracked chunks are dominated by Next app/runtime framework payload (2117 + fd9d1056), not by app-level universal imports.
