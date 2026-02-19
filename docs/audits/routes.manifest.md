# Route Manifest

Canonical app root: `app`

| Route | Page file | Layout in same segment |
| --- | --- | --- |
| `/dashboard` | `app/dashboard/page.tsx` | No |
| `/ingest` | `app/ingest/page.tsx` | No |
| `/live/[gameId]` | `app/live/[gameId]/page.tsx` | No |
| `/live` | `app/live/page.tsx` | No |
| `/` | `app/page.tsx` | Yes |
| `/pending-bets` | `app/pending-bets/page.tsx` | No |
| `/research` | `app/research/page.tsx` | No |
| `/research/snapshot/[snapshotId]` | `app/research/snapshot/[snapshotId]/page.tsx` | No |
| `/traces/[trace_id]` | `app/traces/[trace_id]/page.tsx` | No |
| `/traces` | `app/traces/page.tsx` | No |
