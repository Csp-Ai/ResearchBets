# ResearchBets Shipping Checklist

## Canonical product truth
- [ ] Reconcile `README.md`, `docs/ROUTES.md`, and `docs/COCKPIT_CANONICAL_ENTRY.md` so they describe the same canonical entry and route behavior.
- [ ] Remove or demote non-canonical public CTAs that still point users toward legacy/discovery/dashboard-style surfaces.
- [ ] Mark which routes are canonical, compatibility redirects, or dev-only.

## Core bettor loop
- [ ] Issue stable `slip_id` / `trace_id` at the first meaningful draft action, not only after stress-test execution.
- [ ] Verify board -> slip -> stress-test -> track -> review continuity preserves the same context spine.
- [ ] Add a bettor-facing run progress strip in stress-test using existing pipeline event stages.

## Realism and trust
- [ ] Replace the default review upload flow in `app/(product)/control/ControlPageClient.tsx` with the real parsing/extraction pipeline.
- [ ] Keep demo sample review as an explicit fallback, clearly labeled as demo.
- [ ] Upgrade `/track` and `/control?tab=live` to consume one shared tracking/live-status read model.
- [ ] Surface live/cache/demo provenance and fallback reasons consistently on major user surfaces.

## Persistence and operations
- [ ] Decide and document the authoritative DB schema baseline (`supabase/schema.sql` vs `db/supabase/schema.sql`).
- [ ] Tighten permissive `run_events` / telemetry access policies before wider deployment.
- [ ] Document which workflow state is local-only versus Supabase-backed.
- [ ] Verify Vercel cron, env-check, and today-cache behavior remain truthful in demo/cache/live modes.

## Release confidence
- [ ] Re-run the static route/docs/governor/schema checks after the above changes.
- [ ] Confirm the most important user journey remains narrow: landing -> board -> slip -> stress-test -> track -> review.
- [ ] Defer broader community/social/platform expansion until the canonical bettor loop is fully trustworthy.
