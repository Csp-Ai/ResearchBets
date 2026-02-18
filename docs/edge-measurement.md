# Agent Accuracy + User Edge Measurement

## Data flow
1. `buildResearchSnapshot` logs per-agent and final recommendations into `ai_recommendations`.
2. Odds snapshots are persisted in `odds_snapshots` during recommendation or follow-up polling.
3. Final game payloads are ingested into `game_results`.
4. Settlement resolves closing odds, computes CLV, and writes:
   - `recommendation_outcomes`
   - enriched `bets` fields (`closing_line`, `closing_price`, `clv_line`, `clv_price`, `followed_ai`)
5. `GET /api/edge/report` compares followed vs not-followed cohorts.

## Deterministic ambiguity conventions
When source data is ambiguous, we apply the smallest deterministic convention:

- **Closing odds definition:** latest snapshot before `game_starts_at`; if unavailable, latest snapshot before `game_results.completed_at - 60s`.
- **Followed AI definition:** `bets.followed_ai = true` if `recommended_id` is present or explicit `followed_ai` is supplied.
- **Experiment assignment:** deterministic 50/50 from SHA-256 hash of `experiment_name:subject_key`.
- **Window parsing:** `window` query is `<N>d`; currently defaults to `30d` if unspecified.
