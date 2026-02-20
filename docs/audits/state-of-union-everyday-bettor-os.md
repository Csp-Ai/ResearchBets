# State of the Union Audit: ResearchBets vs Everyday Bettor OS Vision

## Executive Snapshot
ResearchBets has a **solid server-domain core** (provider abstractions, deterministic run pipeline, typed schemas, and Supabase-backed runtime persistence), but the shipped product surface still contains a mixed identity: parts of a bettor-first UX, parts of a legacy dashboard/terminal shell.

---

## 1) Architecture & Pattern Match

### Core data flow (provider abstraction ➜ UI)
1. `/research` client UI triggers `runSlip(...)` from `src/core/pipeline/runSlip.ts`.
2. `runSlip` extracts legs (`extractLegs` / slip APIs), then enriches each leg via provider adapters (`enrichStats`, `enrichInjuries`, `enrichOdds`) and contextual data via `getRunContext(...)`.
3. The run is persisted through `runStore` and rendered back in `app/research/page.tsx` through verdict-first blocks (`VerdictHero`, ranked legs, actions).
4. Parallel path: `/api/researchSnapshot/start` calls `buildResearchSnapshot(...)`, which orchestrates connectors + live agents (`runStatsScout`, `runLineWatcher`, `runOpponentContextScout`, `runInjuryScout`), writes insights/events/snapshots, and returns snapshot identifiers.
5. Live/scout tab data currently comes from `/api/bettor-data` ➜ `getBettorData`, which always returns demo games even in "live" mode flagging.

### Pattern-match strengths
- Strong separation of provider concerns: `createProviderRegistry(...)` encapsulates live-vs-fallback behavior and provenance.
- Deterministic, typed orchestration in snapshot flow with guardrails (citation allowlist, PII redaction, suspicious evidence filtering).
- Verdict-first presentation exists in `/research` with progressive disclosure blocks.

### Deviations from Bettor OS vision (terminal/dashboard residue)
- Global shell still framed as a classic nav/header layout with utility links and terminal-era routes (`/traces`, `/dashboard`, `/discover`) instead of focused consumer journey.
- `app/dashboard/page.tsx` still exists and explicitly references old dashboard model.
- `src/components/terminal/*` remains a large, active UI surface (trace views, inspector, run headers), signaling unfinished migration away from internal tooling UX.

### `src/components` motion/system check
- There is a **seed of reusable primitives** (`ui/button`, `ui/surface`, `ui/chip`) and a reusable motion hook (`useMotionVariants`).
- But component usage is inconsistent: many components bypass primitives and hardcode Tailwind classes/button styles directly.
- Quick scan signal: far more raw `className="..."` usage than primitive imports; motion usage appears limited to a small subset of views.
- Result: design system drift risk (visual inconsistency, duplicated style logic, difficult premium-polish iteration).

---

## 2) "Unknown Unknowns" Risk Assessment

### Supabase schema / migration risks

#### RLS gaps
- `supabase/schema.sql` enables RLS on a narrow subset (`ai_recommendations`, `odds_snapshots`, `game_results`, `recommendation_outcomes`, `experiment_assignments`) but **many user/event tables are missing RLS policies** (`bets`, `events_analytics`, `research_reports`, `runtime_sessions`, `slip_submissions`, etc.).
- New bettor OS foundation tables (`user_profiles`, `historical_bets`, `community_posts`) are created in migration `20260220090000...` with **no RLS + no policies**.

#### Index/relational scale risks
- Several FK-heavy tables lack supporting indexes for join/filter paths (examples: `research_snapshots.user_id/session_id`, `bets.snapshot_id`, `community_posts.profile_id`, `historical_bets.profile_id`).
- `events_analytics` is write-heavy and query-heavy but only has PK; no explicit secondary indexes in schema for common filters like `trace_id`, `timestamp`, `event_name`, or `session_id`.

#### Schema drift risk
- Two schema baselines exist and diverge materially: `supabase/schema.sql` and `db/supabase/schema.sql`; this can cause environment inconsistency and migration ambiguity during deploy/reset.

### `src/core/agents` handoff protocol check
- `src/core/agents` currently only includes progress normalization logic (`progress.ts`), not orchestration contracts.
- Actual agent behavior is split across `src/agents/live/*` and snapshot flow orchestration in `src/flows/researchSnapshot/buildResearchSnapshot.ts`.
- Handoffs are currently function-level composition with preload payloads (good for speed) but no explicit cross-agent protocol/state machine contract. Coupling risk rises as agent count grows.

### API security / unsafe patterns
- Multiple mutating endpoints appear callable without auth/rate-limit/idempotency enforcement gates in-route (e.g. settlement run, results ingest, snapshot start).
- `app/api/researchSnapshot/start` accepts caller-supplied `sessionId`/`userId` and triggers writes without visible access checks.
- Operational risk: abuse/spam, unauthorized writes, and potentially noisy analytics contamination.

---

## 3) Vision Alignment Gap Analysis

### Target routes check

#### `/` (Landing)
- Present and motion-enabled via `LandingPageClient`.
- Still partially static/demo-style CTA experience; does not yet deeply integrate live social proof, accountless personalization, or community momentum.

#### `/research` (Hub)
- Exists and broadly matches Analyze/Scout/Live tab target.
- Gap: scout/live tab data pipeline is demo-envelope first (`getBettorData` returns `DEMO_GAMES`) so production truth path is incomplete.

#### `/u/[username]` (Profile)
- Route exists but currently placeholder-only; no backend fetch, no profile hydration, no historical bet feed.

### Adjacent route + backend mismatch examples
- `/community` route renders hardcoded FEED array; no backend post creation/read/reaction pipeline is wired.
- Supabase migration creates `community_posts`, but no route/service path found for CRUD/engagement.
- Foundation tables exist (`user_profiles`, `historical_bets`) but app-level data access/use cases are mostly absent.

---

## ✅ Strong Points
- Provider and connector abstractions are in place and testable; architecture is not monolithic.
- Research snapshot pipeline has strong deterministic instrumentation, evidence guardrails, and event emission.
- `/research` has a clear verdict-first orientation and better bettor-language than classic quant dashboards.
- Runtime persistence abstraction (`RuntimeStore`) allows memory/supabase backend swaps cleanly.

## ⚠️ Critical Risks
- RLS/policy coverage is incomplete for many tables, including newly added bettor/community tables.
- Missing secondary indexes on likely high-frequency join/filter columns will degrade scale quickly.
- API mutation routes lack visible auth/rate limiting protections.
- UI system drift: hardcoded Tailwind patterns outweigh reusable motion/system primitives.
- Product experience split between bettor-first pages and terminal/dashboard legacy surfaces.
- Supabase schema drift between `supabase/` and `db/supabase/` threatens reliable deploys.

---

## 🛠️ The "Golden Path" Plan (Next 3 Critical Technical Tasks)

1. **Lock down data plane + production safety (Blocker 0)**
   - Add/validate RLS + policies for all user/session/community tables.
   - Add authz checks + rate limiting/idempotency for all mutating `app/api/*` routes.
   - Add missing DB indexes for core filters/joins (`*_id`, `trace_id`, time-series columns).
   - Outcome: secure and scalable baseline for Vercel launch.

2. **Unify bettor-facing read models and remove demo bottlenecks (Blocker 1)**
   - Replace `DEMO_GAMES` envelope path with provider-backed read models for Scout/Live.
   - Implement backend services + API for `community_posts` and `user_profiles` hydration.
   - Wire `/u/[username]` and `/community` to real Supabase queries with graceful empty states.
   - Outcome: target routes become genuinely functional, not static shells.

3. **Design-system/motion convergence + legacy surface deprecation (Blocker 2)**
   - Create/expand motion-first primitives (cards, buttons, list items, transitions) and enforce usage.
   - Refactor high-traffic components in `src/components` to primitives and standardized tokens.
   - De-scope or isolate terminal/dashboard views behind dev-only affordances to avoid brand split.
   - Outcome: consistent premium bettor-app feel aligned with Everyday Bettor OS vision.

---

## Sprint Order of Operations (practical)
1. Security + schema hardening PR series (RLS/policies/indexes + API guards).
2. Community/Profile backend + route wiring PR series.
3. UI refactor/motion system PR series and terminal de-emphasis.
