import 'server-only';

import { randomUUID } from 'node:crypto';

import { TraceContextSchema } from '@/src/core/contracts/envelopes';
import { runtimeFlags } from '@/src/core/env/runtime.server';

const read = (request: Request, key: string): string | null => {
  const url = new URL(request.url);
  return url.searchParams.get(key) ?? request.headers.get(key);
};

export function getTraceContext(request: Request) {
  const modeParam = read(request, 'mode');
  const mode = modeParam === 'live' || modeParam === 'demo'
    ? modeParam
    : runtimeFlags.liveModeEnabled
      ? 'live'
      : 'demo';

  const candidate = {
    trace_id: read(request, 'trace_id') ?? read(request, 'x-trace-id') ?? randomUUID(),
    sport: read(request, 'sport') ?? 'NBA',
    tz: read(request, 'tz') ?? 'America/Phoenix',
    date: read(request, 'date') ?? new Date().toISOString().slice(0, 10),
    mode,
  };

  return TraceContextSchema.parse(candidate);
}
