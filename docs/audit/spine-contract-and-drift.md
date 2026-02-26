# Data Contract Spine and Drift Audit

## Canonical spine contract (existing)
Current canonical query spine already exists in `src/core/nervous/spine.ts`:
- Required keys: `sport`, `tz`, `date`, `mode`
- Optional keys: `gameId`, `propId`, `slipId`, `trace_id`
- Helpers: `normalizeSpine`, `parseSpineFromSearch`, `serializeSpine`
- Route-link composer: `toHref` in `src/core/nervous/routes.ts`

## Drift findings

### 1) Slip state exists only in session storage (major)
- `DraftSlipStore` writes/reads `rb:draft-slip:v1` from `window.sessionStorage`.
- `/today` and `/slip` rely on this for leg continuity.
- This means refresh/device/tab transitions can lose canonical slip continuity and there is no server-side `slipId` until explicit submission.

### 2) Prefill handoff from scout to stress-test is key-based session bridge
- `SCOUT_ANALYZE_PREFILL_STORAGE_KEY` is written in `/today` and read in `/stress-test`.
- This avoids long query strings but creates hidden state and weak shareability/replayability.

### 3) `trace_id` propagation is inconsistent before run creation
- Some flows push `trace` query alias, others `trace_id`; parsing tolerates both, but route links do not always preserve one canonical key.
- BEFORE phase interactions (add/remove/reorder legs) are generally not associated with a generated trace until `runSlip` executes.

### 4) Parallel run truths: browser `runStore` vs runtime events/slip tables
- `runStore` keeps runs in localStorage/Supabase browser table.
- Slip ingestion and events use runtime store on server APIs.
- Without a strict handshake (`slip_id ↔ trace_id ↔ run_id`), UI surfaces can diverge on what “latest run” means.

### 5) Links that can drop context
- Any raw `href="/path"` usages bypassing `nervous.toHref(...)` can drop spine keys.
- Alias routes (e.g., `/research` redirect to `/stress-test`) preserve query via helper, but some intra-component links still use plain paths.

## Proposed source-of-truth rule-set (minimum viable)

1. **One canonical query object everywhere**: all bettor routes must read/write via nervous spine helpers.
2. **Canonical key names**: standardize on `trace_id` in URL (keep backward parse support for `trace`).
3. **Slip identity early**: generate and propagate `slipId` at first meaningful slip interaction (first add or analyze click), not only after submit.
4. **Run continuity tuple**: enforce `{ slipId, trace_id }` across `/slip`, `/stress-test`, `/control` links.
5. **Decision views consume server-backed IDs when present**; session/local state is fallback only.

## Minimum code changes to enforce (planned, not implemented in this audit)

1. Add `ensureSlipId()` utility and set `slipId` in spine on first draft mutation.
2. Update key navigations (`/today` add/analyze, `/slip` analyze, `/control` latest run links) to always include spine + `slipId` + `trace_id` when available.
3. Introduce `normalizeTraceQuery()` helper that writes only `trace_id` on navigation.
4. Add tiny guard test suite:
   - every bettor loop route preserves `sport/tz/date/mode`
   - analyze transitions preserve or create `slipId`
   - trace links output `trace_id` only
5. Add a run handshake note in architecture docs to clarify runtime store vs browser run store precedence.

## Practical impact
This rule-set keeps the app deterministic/demo-safe while making sessions replayable and making telemetry actually useful for bettor decisions instead of only debugging.
