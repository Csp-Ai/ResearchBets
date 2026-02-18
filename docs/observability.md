# Observability Specification

## Purpose
This document defines first-class observability requirements for agent workflows and outcomes. All production services **must** emit structured events in JSON format and include traceability metadata for every event.

## Global Event Contract
Every log event must include the following top-level fields:

- `event_name` (string): canonical event type.
- `request_id` (string): unique request/correlation identifier.
- `user_id` (string, nullable): authenticated user identifier when available.
- `agent_id` (string): unique logical agent identifier.
- `model_version` (string): model/runtime version used for inference.
- `timestamp` (string, RFC 3339 UTC): event emission timestamp.
- `confidence` (number, nullable): confidence score in `[0,1]` when applicable.
- `assumptions` (array of strings, nullable): assumptions the agent used.

Recommended common fields:

- `environment` (string): `dev`, `staging`, or `prod`.
- `latency_ms` (integer): operation latency.
- `session_id` (string): user session identifier.

## Mandatory Structured Events

### 1) `agent_invocation_started`
Emitted immediately when an agent request begins processing.

Required event-specific fields:

- `input_type` (string): source classification, e.g. `free_text`, `bet_slip`, `scheduled_job`.
- `input_size` (integer): normalized input size (tokens, bytes, or rows).
- `trigger` (string): user action or system trigger.

### 2) `agent_invocation_completed`
Emitted on successful completion of an agent invocation.

Required event-specific fields:

- `run_id` (string): unique invocation/run identifier.
- `status` (string): must be `success`.
- `output_type` (string): output classification.
- `duration_ms` (integer): end-to-end processing time.
- `tokens_in` (integer, nullable): model prompt tokens.
- `tokens_out` (integer, nullable): model completion tokens.

### 3) `agent_scored_decision`
Emitted when the agent produces a scored recommendation or decision.

Required event-specific fields:

- `run_id` (string): invocation/run identifier.
- `decision_id` (string): unique decision identifier.
- `market` (string): betting market/category.
- `score` (number): model decision score (normalized to `[0,1]` unless documented otherwise).
- `confidence` (number): confidence associated with this decision.
- `rationale` (string): short machine-readable summary.
- `features` (object): key derived inputs used for scoring.

### 4) `agent_error`
Emitted when invocation processing fails, including recoverable and terminal failures.

Required event-specific fields:

- `run_id` (string, nullable): invocation/run identifier if already created.
- `status` (string): `error` or `partial_error`.
- `error_code` (string): stable machine code.
- `error_type` (string): taxonomy class (validation, dependency, timeout, inference, etc.).
- `error_message` (string): sanitized message suitable for logs.
- `retryable` (boolean): whether automated retry is valid.

### 5) `user_outcome_recorded`
Emitted when a real-world bet or recommendation outcome is persisted.

Required event-specific fields:

- `outcome_id` (string): unique outcome identifier.
- `run_id` (string, nullable): associated invocation/run identifier.
- `bet_id` (string): stable bet identifier.
- `settlement_status` (string): `won`, `lost`, `void`, or `pending`.
- `pnl_amount` (number): realized profit/loss in account currency.
- `odds` (number, nullable): settled decimal odds.
- `settled_at` (string, RFC 3339 UTC): settlement timestamp.

## Example Event Envelope

```json
{
  "event_name": "agent_scored_decision",
  "request_id": "req_018f33f7c5",
  "user_id": "usr_1024",
  "agent_id": "nba_totals_v1",
  "model_version": "gpt-5.2-codex-2026-01-15",
  "timestamp": "2026-02-18T10:24:03Z",
  "confidence": 0.78,
  "assumptions": ["lineup unchanged", "no weather impact"],
  "run_id": "run_789",
  "decision_id": "dec_456",
  "market": "nba_spread",
  "score": 0.81,
  "rationale": "Edge detected vs consensus close",
  "features": {
    "line_movement": -1.5,
    "injury_adjustment": 0.22
  }
}
```

## Governance
- Event names and field contracts are versioned; incompatible changes require changelog updates.
- PII must be excluded or tokenized before logging.
- All mandatory events must be queryable in the analytics warehouse within SLA.


### 6) `edge_report_generated`
Emitted when the edge measurement report is generated.

Required event-specific fields:

- `window` (string): report lookback window, e.g. `30d`.
- `bet_count` (integer): number of bets included in the report.

### 7) `external_fetch_started`
Emitted when WAL begins acquisition from a source URL.

Required event-specific fields:
- `url` (string)
- `data_type` (string): `odds` | `results` | `news`

### 8) `external_fetch_completed`
Emitted when WAL fetch completes successfully.

Required event-specific fields:
- `url` (string)
- `data_type` (string)
- `record_count` (integer)
- `stale` (boolean)

### 9) `external_fetch_failed`
Emitted when WAL fetch fails after retries.

Required event-specific fields:
- `url` (string)
- `data_type` (string)
- `error` (string)

### 10) `data_normalized`
Emitted after parser + normalization layers complete.

Required event-specific fields:
- `data_type` (string)
- `stale` (boolean)

### 11) `odds_snapshot_captured`
Emitted when normalized odds are persisted.

Required event-specific fields:
- `game_id` (string)
- `market` (string)
- `selection` (string)
- `captured_at` (RFC 3339)
- `source_url` (string, nullable)
- `source_domain` (string, nullable)
- `staleness_ms` (integer)

### 12) `game_result_ingested`
Emitted when a game result is persisted.

Required event-specific fields:
- `outcome_id` (string)
- `bet_id` (string)
- `settlement_status` (string)
- `settled_at` (RFC 3339)
- `is_final` (boolean)
