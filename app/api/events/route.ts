import { NextResponse } from 'next/server';
import { z } from 'zod';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { ControlPlaneEventSchema, type ControlPlaneEventName } from '@/src/core/control-plane/events';
import { EventEnvelopeSchema } from '@/src/core/contracts/envelopes';
import {
  isMissingAnalyticsSchemaError,
  logAnalyticsSchemaDegradationOnce,
} from '@/src/core/persistence/analyticsSchemaGuard';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';
import { getTraceContext } from '@/src/core/trace/getTraceContext.server';

const EventPostSchema = z.union([ControlPlaneEventSchema, EventEnvelopeSchema]);

const inferPhase = (eventName: string): 'BEFORE' | 'DURING' | 'AFTER' => {
  if (eventName.includes('submitted') || eventName.includes('started')) return 'BEFORE';
  if (eventName.includes('settled') || eventName.includes('completed')) return 'AFTER';
  return 'DURING';
};

const asEnvelope = (event: Record<string, unknown>) => EventEnvelopeSchema.parse({
  trace_id: String(event.trace_id ?? ''),
  phase: inferPhase(String(event.event_name ?? 'unknown')),
  type: String(event.event_name ?? 'unknown'),
  payload: event,
  timestamp: String(event.timestamp ?? new Date().toISOString()),
});

export async function POST(request: Request) {
  const trace = getTraceContext(request);
  const parsed = EventPostSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid event payload', trace_id: trace.trace_id }, { status: 400 });
  }

  try {
    const payload = parsed.data;
    if ('event_name' in payload) {
      await new DbEventEmitter(getRuntimeStore()).emit({
        ...payload,
        trace_id: payload.trace_id || trace.trace_id,
        properties: { ...payload.properties, phase: inferPhase(payload.event_name as ControlPlaneEventName) },
      });
    } else {
      await new DbEventEmitter(getRuntimeStore()).emit({
        event_name: 'ui_action_started',
        timestamp: payload.timestamp,
        request_id: crypto.randomUUID(),
        trace_id: payload.trace_id || trace.trace_id,
        session_id: 'api_events',
        user_id: 'api_events',
        agent_id: 'events_envelope',
        model_version: 'events-envelope-v1',
        properties: { phase: payload.phase, type: payload.type, payload: payload.payload },
      });
    }

    return NextResponse.json({ ok: true, trace_id: trace.trace_id });
  } catch {
    return NextResponse.json({ ok: false, error: 'Failed to process event', trace_id: trace.trace_id }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const trace = getTraceContext(request);
  const { searchParams } = new URL(request.url);
  const traceId = searchParams.get('trace_id') ?? trace.trace_id;
  const limit = Number(searchParams.get('limit') ?? 25);

  try {
    const events = await getRuntimeStore().listEvents({ traceId, limit: Number.isFinite(limit) ? limit : 25 });
    const envelopes = z.array(EventEnvelopeSchema).parse(events.map((event) => asEnvelope(event as Record<string, unknown>)));
    return NextResponse.json({ ok: true, trace_id: traceId, events: envelopes });
  } catch (error) {
    if (isMissingAnalyticsSchemaError(error)) {
      logAnalyticsSchemaDegradationOnce('/api/events GET', error);
      return NextResponse.json({ ok: true, trace_id: traceId, events: [] });
    }
    return NextResponse.json({ ok: false, trace_id: traceId, events: [], error: 'Failed to list events' }, { status: 500 });
  }
}
