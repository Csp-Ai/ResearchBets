import { z } from 'zod';

export const RuntimeEventNameSchema = z.enum([
  'RUN_STARTED',
  'INPUT_VALIDATED',
  'AGENT_STARTED',
  'AGENT_FINISHED',
  'OUTPUT_VALIDATED',
  'RUN_FINISHED',
  'RUN_FAILED',
  'CONNECTOR_SELECTED',
  'CONNECTOR_FETCH_STARTED',
  'CONNECTOR_FETCH_FINISHED',
  'EVIDENCE_NORMALIZED',
  'REPORT_VALIDATED',
  'REPORT_SAVED',
]);

export type RuntimeEventName = z.infer<typeof RuntimeEventNameSchema>;

export const ObservabilityEventNameSchema = z.enum([
  'agent_invocation_started',
  'agent_invocation_completed',
  'agent_error',
]);

export const TraceEventSchema = z.object({
  eventName: RuntimeEventNameSchema,
  observabilityEventName: ObservabilityEventNameSchema,
  timestamp: z.string().datetime(),
  traceId: z.string().min(1),
  runId: z.string().min(1),
  requestId: z.string().min(1),
  userId: z.string().nullable(),
  agentId: z.string().min(1),
  modelVersion: z.string().min(1),
  confidence: z.number().min(0).max(1).nullable(),
  assumptions: z.array(z.string()).nullable(),
  latencyMs: z.number().int().nonnegative().optional(),
  tokensIn: z.number().int().nullable().optional(),
  tokensOut: z.number().int().nullable().optional(),
  costUsd: z.number().nullable().optional(),
  environment: z.enum(['dev', 'staging', 'prod']).optional(),
  sessionId: z.string().optional(),
  payload: z.record(z.unknown()).default({}),
});

export type TraceEvent = z.infer<typeof TraceEventSchema>;

export interface TraceEmitter {
  emit(event: TraceEvent): Promise<void> | void;
}

export class InMemoryTraceEmitter implements TraceEmitter {
  private readonly events: TraceEvent[] = [];

  emit(event: TraceEvent): void {
    const validated = TraceEventSchema.parse(event);
    this.events.push(validated);
  }

  getEvents(): TraceEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events.length = 0;
  }
}
