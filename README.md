# ResearchBets V2

ResearchBets is an anonymous-first AI sports betting research platform designed around a compounding workflow:

**Bet Slip → Confirm → Track → Alert → Insight**

This repository contains the production-grade MVP foundation for that loop.

## Problem

Sports bettors often spread research and performance tracking across screenshots, spreadsheets, and disconnected tools. That fragmentation creates blind spots around:

- bankroll performance,
- line movement context,
- and repeatable decision quality.

ResearchBets solves this by centralizing ingestion, tracking, and insight generation while supporting anonymous-first usage.

## Product Pillars

1. **Anonymous-first by default**: local session identity with optional auth later for persistence.
2. **Structured bet ingestion**: typed and validated boundaries using Zod.
3. **Lifecycle tracking**: open/settled states with ROI visibility.
4. **Alert-ready architecture**: line movement and event-driven updates prepared by feature boundaries.
5. **AI insight readiness**: clean service boundaries for future analysis modules.

## Architecture Overview

The codebase follows a feature-based modular architecture:

```txt
app/                     # Next.js App Router pages and layouts
entities/                # Domain entities, schemas, and type contracts
features/
  games/                 # Game-specific UX and logic (planned)
  research/              # Dashboard and analytics UI
  betslip/               # Ingestion UX and normalization logic
  tracker/               # Bet state and settlement flow
  alerts/                # Line movement alert modules (planned)
  insights/              # Performance insight modules (planned)
services/
  ai/                    # External AI integrations (planned)
  sports/                # Sportsbook/odds provider integrations (planned)
lib/                     # Cross-cutting runtime concerns
db/                      # Database schema and migrations
docs/                    # Architecture and product documentation
```

### Key Decisions

- **Strict TypeScript + Zod** for domain and boundary safety.
- **Thin pages, rich features** so vertical workflows stay modular.
- **Supabase-ready schema** with UUID session support and status/outcome constraints.
- **No auth dependency for MVP**; anonymous session ID is generated in-browser.

## Local Development Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

```bash
cp .env.example .env.local
```

Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` when you are ready to connect persistence.

### 3) Run the app

```bash
npm run dev
```

### 4) Quality gates

```bash
npm run lint
npm run typecheck
npm run format
```

### 5) Apply Supabase schema

Execute SQL in `db/supabase/schema.sql` using the Supabase SQL editor or migration tooling.

## MVP Roadmap

### Phase 1 (in progress)

- [x] Anonymous session identity (localStorage UUID)
- [x] Bet entity schema and validation
- [x] Minimal dashboard and ingestion flows
- [x] Bet tracking state (open/settled)
- [x] Supabase `bets` table schema

### Phase 2

- [ ] Persist anonymous sessions and bets via Supabase client repositories
- [ ] Add line movement provider integration in `services/sports`
- [ ] Build alert subscription and notification workflows

### Phase 3

- [ ] AI-driven performance insight generation
- [ ] Optional authentication for cross-device persistence
- [ ] Role-based operational tooling

## First Commit Message Suggestion

```txt
chore: scaffold ResearchBets V2 MVP architecture and core bet tracking flow
```
