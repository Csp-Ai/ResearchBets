# Hackathon Changelog (Lifecycle Sprint)

## v0.6.0 — Bettor Lifecycle OS + Mobile E2E Loop + Decision Integrity (Pre-release)

Status: Pre-release / pre-production

### 1) What this release is

- ResearchBets is a decision-intelligence workflow, not a picks app.
- This release prioritizes bettor time-to-value, continuity across the loop, deterministic demo safety, and full loop closure.

### 2) Lifecycle OS shipped (BEFORE / DURING / AFTER)

**BEFORE**
- Canonical React landing owns `/`.
- Tonight’s Board + Scout cards + clean terminal layout.
- Live-first Today loop with deterministic demo fallbacks (no empty states).
- Mode health (Demo vs Live) is shown truthfully with neutral tone.

**DURING**
- Slip ingestion loop: `/ingest` → `/slip` → `/stress-test`.
- `SlipStructureReport` unifies analysis output.
- Stress-test “Decision Terminal” layout + Scout→Analyze handoff.
- Lazy tab loading and loop-back CTAs preserve flow.

**AFTER**
- Control Room surfaces postmortem + telemetry + loop-closure actions.
- Events/postmortem degrade gracefully when schema is missing.
- Outcome tracking + history surfaces exist via `/history` and `/api/history-bets`.

### 3) Decision Integrity substrate

- Enforced `ContextSpine` and trace provenance across APIs/events.
- Trace continuity preserved across CTAs/navigation.
- Unified API envelope: `{ ok, data, degraded, source, error_code, trace_id }`.
- Provider fallback semantics are deterministic with neutral copy.

### 4) Performance + maintainability (Sprint 6 kickoff work)

- Lazy boundaries on `/ingest` and `/control` (large first-load improvement).
- `/stress-test` reduced but still the largest route bundle; next target is additional splits.
- Pruned/archived non-canonical landing variants.
- Added repo grounding docs + LLM operating rules (`README.md` + `llm.txt`).
- Dependency hygiene: `server-only` added, unused dev deps removed while preserving required tooling.
- Fixed `exhaustive-deps` warnings in `HomeLandingPage.tsx` without suppression directives.

### 5) Mobile E2E bettor loop (PR140)

- `/login` (magic-link UX scaffold) and `/profile` (username save).
- Phone-first `/ingest` with “My slip” vs “Shared slip/text”.
- Deterministic free-text parser + parse confidence + needs-review signal.
- Shared-slip feedback agent: KEEP/MODIFY/PASS + weakest leg + safer alternative.
- `/history`: recent uploads + Run settle CTA.
- `/api/history-bets`: list + deterministic settle + PnL summary + neutral demo/live banners.
- Supabase migration + RLS for `profiles` / `slips` / `legs` / `settlements` / `leg_results` / `feedback_items`.
- Browser-safe Supabase client helper with no server-only leakage into client modules.

### 6) Known limitations (truthful, not scary)

- Real historical result reconciliation requires official data providers or licensed feeds (no scraping FanDuel/PrizePicks).
- Auth/session hardening is scaffold-level; this is not production identity yet.
- `/stress-test` bundle remains relatively heavy; next sprint targets additional splits and perf budgets.

### 7) How to try it fast (phone path)

- `/login` → `/profile` → `/ingest` → `/history` → `/today` → `/stress-test`.
- Confirm sport/tz/date/mode continuity remains in URL/query while navigating.

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
