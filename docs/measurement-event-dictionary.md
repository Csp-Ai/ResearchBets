# Measurement Event Dictionary

This document defines the canonical metric-event specification and required fields used by the metric event validator.

Validation mode is controlled by `METRIC_EVENT_VALIDATION`:

- `warn` (default): missing required fields emit warning logs.
- `off`: validation is skipped.
- `error`: missing required fields throw.

## Canonical metric events

### `decision_card_rendered`
- Alias event names in code: `agent_scored_decision`
- Required `properties` fields:
  - `decision_id`
  - `market`
  - `score`
  - `rationale`
  - `features`

### `bet_tracked`
- Alias event names in code: `bet_logged`
- Required `properties` fields:
  - `bet_id`

### `bet_settled`
- Alias event names in code: `bet_settled`, `user_outcome_recorded`
- Required `properties` fields:
  - `outcome_id`
  - `bet_id`
  - `settlement_status`
  - `pnl_amount`
  - `settled_at`

### `outcome_ingested`
- Alias event names in code: `game_result_ingested`
- Required `properties` fields:
  - `outcome_id`
  - `settled_at`
  - `is_final`

### `edge_realized`
- Alias event names in code: `edge_realized_logged`, `edge_realized_computed`
- Required `properties` fields:
  - `game_id`

### `calibration_updated`
- Alias event names in code: `calibration_update`
- Required `properties` fields:
  - `brier_score`
  - `edge_decay_rate`
