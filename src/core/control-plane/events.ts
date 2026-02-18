import { z } from 'zod';

export const ControlPlaneEventNameSchema = z.enum([
  'APP_OPENED',
  'SESSION_STARTED',
  'RUN_ACCEPTED',
  'RUN_STARTED',
  'CONNECTOR_SELECTED',
  'CONNECTOR_FETCH_STARTED',
  'CONNECTOR_FETCH_FINISHED',
  'EVIDENCE_NORMALIZED',
  'REPORT_VALIDATED',
  'SNAPSHOT_SAVED',
  'SNAPSHOT_VIEWED',
  'PLACE_BET_CLICKED',
  'BET_LOG_OPENED',
  'BET_LOGGED',
  'BET_SETTLE_OPENED',
  'BET_SETTLED',
  'DASHBOARD_VIEWED',
  'INSIGHTS_VIEWED',
  'RETURN_VISIT',
  'GUARDRAIL_TRIPPED'
]);

export const ControlPlaneEventSchema = z.object({
  eventName: ControlPlaneEventNameSchema,
  timestamp: z.string().datetime(),
  traceId: z.string().min(1),
  runId: z.string().optional(),
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  properties: z.record(z.unknown()).default({})
});

export type ControlPlaneEventName = z.infer<typeof ControlPlaneEventNameSchema>;
export type ControlPlaneEvent = z.infer<typeof ControlPlaneEventSchema>;
