# Repo Hygiene / Deadweight Check (Report Only)

## Potentially unused or weakly integrated routes/components
1. `/research` is an alias redirect to `/stress-test`; keep only if external links depend on it, otherwise this is conceptual duplication.
2. `/traces` and `/traces/[trace_id]` are development-gated and powerful, but can distract if linked from bettor flow in non-dev contexts.
3. `/dev/*` surfaces (`/dev/dashboard`, `/dev/mirror`) are cleanly namespaced but should remain isolated from primary nav in production UX.

## Duplicated concept clusters
1. **Today vs Board vs Scout naming drift**
   - “Today payload”, “board data”, “scout cards” all represent adjacent layers of same concept.
   - Recommendation: define one glossary in docs and UI copy; e.g., Board (screen) → Scout (card) → Leg (action object).

2. **Run identity drift**
   - `trace`, `trace_id`, local run records, and slip submission trace can represent the same session differently.
   - Recommendation: standardize to `trace_id` in URLs and explicit mapping in state model.

3. **Storage duplication**
   - Draft slip in sessionStorage, runs in localStorage/Supabase browser, events/slips in runtime store.
   - Recommendation: declare source precedence and sync checkpoints in architecture docs.

## Dev-only behavior bleeding toward bettor UI
1. Advanced/developer drawers and trace-oriented language are visible on stress-test page and can feel diagnostic-first.
2. Control review flow includes mock OCR parsing by filename heuristic; this should be clearly marked as simulation in bettor UI copy.
3. Some empty states still reference “demo/sample” mechanics without explicit confidence framing.

## Dependencies/perf critical-path observations
1. Dynamic import strategy in research tabs is good and avoids heavy first-load.
2. No evidence of reintroducing framer-motion in audited bettor loop paths (good).
3. Potential critical-path risk comes from over-fetching multiple endpoints where one envelope exists (`/api/bettor-data`); rationalize before adding net-new fetches.

## Recommendations (no refactor yet)
- Create a single “Loop Contracts” section in `docs/ARCHITECTURE.md` for identity and storage precedence.
- Add a production UI guardrail checklist to PR template: no debug jargon above the fold in bettor surfaces.
- Maintain route manifest and mark each route as bettor, terminal/dev, or admin to prevent accidental nav bleed.
