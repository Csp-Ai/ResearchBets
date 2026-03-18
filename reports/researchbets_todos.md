# ResearchBets TODO / FIXME / HACK / XXX Inventory

## Critical
- `supabase/migrations/20260301090000_run_events_table.sql:31`  
  `TODO tighten to authenticated owners by trace scope.`  
  Why it matters: this is attached to `public.run_events` access policy language, so it points to an explicit security/authorization gap in runtime event storage.

## Important
- `next.config.mjs:12`  
  `TODO(security): add tightly scoped remotePatterns only for required hosts`  
  Why it matters: image host policy is intentionally incomplete; safe now if unused, but it becomes relevant as soon as external images are introduced.

## Minor
- `docs/CHANGELOG_HACKATHON.md` matched the TODO/FIXME/HACK/XXX search, but the hit is from the filename (`HACKATHON`), not an actionable inline code comment.
- `docs/PRODUCT.md` matched the TODO/FIXME/HACK/XXX search, but the hit is from the demo script text containing “postmortem always outputs ‘what failed’”; no actionable TODO marker was found in the file body.
- `services/analytics/slipAnalysis.ts` matched the search pattern at file level during repository scan, but no inline TODO/FIXME/HACK/XXX line was surfaced in the targeted grep output used for this report.

## Notes
- Static scan found very few explicit TODO/FIXME/HACK/XXX markers relative to repo size.
- The larger issue in this repo is not visible inline TODO count; it is product/docs drift and partial/demo-backed implementations that are documented in `docs/audit/*` and `docs/audits/*`.
