export type TelemetryEvent = {
  id?: string;
  event_name: string;
  trace_id?: string;
  request_id?: string;
  created_at?: string;
  timestamp?: string;
  properties?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

export async function getEventsByTraceId(traceId: string, limit = 200): Promise<TelemetryEvent[]> {
  const response = await fetch(`/api/events?trace_id=${encodeURIComponent(traceId)}&limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Unable to fetch telemetry events (${response.status})`);
  }
  const payload = (await response.json()) as { events?: TelemetryEvent[] };
  return payload.events ?? [];
}
