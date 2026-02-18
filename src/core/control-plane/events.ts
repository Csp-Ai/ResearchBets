import { z } from 'zod';

export const ControlPlaneEventNameSchema = z.enum([
  'agent_invocation_started',
  'agent_invocation_completed',
  'agent_scored_decision',
  'agent_error',
  'user_outcome_recorded',
  'session_started',
  'return_visit',
  'snapshot_saved',
  'snapshot_viewed',
  'bet_logged',
  'bet_settled',
  'guardrail_tripped',
  'connector_selected',
  'connector_fetch_started',
  'connector_fetch_finished',
  'evidence_normalized',
  'report_validated',
  'edge_report_generated',
  'external_fetch_started',
  'external_fetch_completed',
  'external_fetch_failed',
  'data_normalized',
  'odds_snapshot_captured',
  'game_result_ingested',
  'consensus_evaluated',
  'consensus_conflict',
]);

const requiredPropertiesByEvent: Record<string, string[]> = {
  agent_invocation_started: ['input_type', 'input_size', 'trigger'],
  agent_invocation_completed: ['status', 'output_type', 'duration_ms'],
  agent_scored_decision: ['decision_id', 'market', 'score', 'rationale', 'features'],
  agent_error: ['status', 'error_code', 'error_type', 'error_message', 'retryable'],
  user_outcome_recorded: ['outcome_id', 'bet_id', 'settlement_status', 'pnl_amount', 'settled_at'],
};

export const ControlPlaneEventSchema = z
  .object({
    event_name: ControlPlaneEventNameSchema,
    timestamp: z.string().datetime(),
    request_id: z.string().min(1),
    trace_id: z.string().min(1),
    run_id: z.string().min(1).optional(),
    session_id: z.string().min(1).optional(),
    user_id: z.string().min(1).nullable().optional(),
    agent_id: z.string().min(1),
    model_version: z.string().min(1),
    confidence: z.number().min(0).max(1).nullable().optional(),
    assumptions: z.array(z.string()).nullable().optional(),
    properties: z.record(z.unknown()).default({}),
  })
  .superRefine((event, ctx) => {
    const required = requiredPropertiesByEvent[event.event_name] ?? [];
    for (const key of required) {
      if (!(key in event.properties)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Missing required property ${key} for ${event.event_name}` });
      }
    }
  });

export type ControlPlaneEventName = z.infer<typeof ControlPlaneEventNameSchema>;
export type ControlPlaneEvent = z.infer<typeof ControlPlaneEventSchema>;
