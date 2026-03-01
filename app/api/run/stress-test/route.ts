import { NextResponse } from 'next/server';

import { getTraceContext } from '@/src/core/trace/getTraceContext.server';
import { resolveTraceId } from '@/src/core/trace/trace_id';
import { runStressTest, RunInputSchema } from '@/src/core/run/runService.server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = RunInputSchema.safeParse(body);
  if (!parsed.success) {
    const { spine } = getTraceContext(request, { requireTraceId: true, body });
    return NextResponse.json({
      trace_id: spine.trace_id,
      spine,
      analysis: { reasons: ['Invalid legs payload.'] },
      events_written: false
    });
  }

  const { spine } = getTraceContext(request, { requireTraceId: true, body: parsed.data });
  const trace_id = resolveTraceId({ search: new URL(request.url).searchParams, body: parsed.data, headers: request.headers }) ?? spine.trace_id!;
  const result = await runStressTest({ trace_id, spine: { ...spine, trace_id }, legs: parsed.data.legs });

  return NextResponse.json({
    trace_id,
    spine: { ...spine, trace_id },
    analysis: result.analysis,
    events_written: result.events_written
  });
}
