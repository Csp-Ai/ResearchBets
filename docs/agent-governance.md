# Agent Governance Specification

## Purpose
This specification defines the minimum metadata and schema controls required to enforce role-bound agent design across the platform.

## Scope
This policy applies to every registered agent in `packages/agent-schemas/registry.json`.

## Required Agent Metadata Fields
Every agent definition MUST provide the following fields:

1. `agent_id` (string)
   - Stable unique identifier for the agent role.
2. `objective` (string)
   - A concise statement of the agent's intended business function.
3. `input_schema` (string)
   - Path to a valid JSON Schema file for the agent input payload.
4. `output_schema` (string)
   - Path to a valid JSON Schema file for the agent output payload.
5. `confidence_model` (string)
   - Method used to represent confidence (e.g., calibrated probability, bounded score).
6. `assumptions` (array of strings)
   - Material assumptions required for safe and correct operation.
7. `kpi` (array of strings)
   - Measurable indicators used to evaluate the role's performance.
8. `logging_fields` (array of strings)
   - Mandatory observability fields emitted per run.
9. `lifecycle_state` (string enum)
   - Current maturity state. Allowed values:
     - `draft`
     - `active`
     - `deprecated`
     - `retired`

## Validation Rules
1. A registry entry is invalid if any required metadata field is missing.
2. A registry entry is invalid if `input_schema` or `output_schema` references a file that does not exist.
3. A registry entry is invalid if any referenced schema file is not valid JSON.
4. A registry entry is invalid if `assumptions`, `kpi`, or `logging_fields` are not arrays of strings.
5. CI MUST fail on invalid registry entries.

## Role-Bound Design Controls
1. `objective` MUST describe the boundary of responsibility for the role.
2. Agents MUST only consume inputs defined by `input_schema`.
3. Agents MUST only emit outputs defined by `output_schema`.
4. Confidence information MUST be represented according to `confidence_model`.
5. KPI ownership MUST align with the role objective.

## Change Management
1. Any new or updated agent entry requires:
   - Updated registry metadata.
   - Corresponding input/output schema changes.
   - Successful execution of `scripts/validate-agent-registry`.
2. Breaking schema changes SHOULD increment schema version suffixes in file names or `$id`.

## CI Enforcement
Run `node scripts/validate-agent-registry` in CI to enforce this policy.
