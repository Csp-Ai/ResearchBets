# Runtime Store Capability Checklist

This checklist maps every `RuntimeStore` method to its durable table.

| Domain | Method | Table |
|---|---|---|
| sessions | `getSession`, `upsertSession` | `runtime_sessions` |
| snapshots/reports | `saveSnapshot`, `getSnapshot` | `research_reports` |
| bets | `listBets`, `saveBet`, `getBet` | `bets` |
| events | `saveEvent` | `events_analytics` |
| idempotency | `getIdempotencyRecord`, `saveIdempotencyRecord` | `idempotency_keys` |
| recommendations | `saveRecommendation`, `listRecommendationsByGame`, `getRecommendation` | `ai_recommendations` |
| odds_snapshots | `saveOddsSnapshot`, `listOddsSnapshots` | `odds_snapshots` |
| game_results | `saveGameResult`, `getGameResult` | `game_results` |
| recommendation_outcomes | `saveRecommendationOutcome`, `getRecommendationOutcome` | `recommendation_outcomes` |
| experiments | `saveExperiment`, `getExperiment` | `experiments` |
| experiment_assignments | `saveExperimentAssignment`, `getExperimentAssignment` | `experiment_assignments` |
| web_cache | `saveWebCache`, `getLatestWebCacheByUrl` | `web_cache` |

## Durability invariant

* Production (`NODE_ENV=production`) resolves runtime persistence to `SupabaseRuntimeStore` only.
* In-memory store is allowed for tests and explicit development override only.

## Provenance + consensus invariant

`odds_snapshots` and `game_results` persist and return:

* provenance: `source_url`, `source_domain`, `fetched_at`, `published_at`, `parser_version`, `checksum`, `staleness_ms`, `freshness_score`
* consensus: `consensus_level`, `sources_used`, `disagreement_score`
