import { NextResponse } from 'next/server';

import { runSlip } from '@/src/core/pipeline/runSlip';
import { toResearchRunDTOFromRun } from '@/src/core/run/researchRunDTO';
import { runStore } from '@/src/core/run/store';
import { draftSlipToCanonicalSlipText, RunInputSchema } from '@/src/core/run/draftSlipAdapter';
import { getTraceContext } from '@/src/core/trace/getTraceContext.server';
import { resolveTraceId } from '@/src/core/trace/trace_id';
import { runStressTest } from '@/src/core/run/runService.server';

const requestBaseUrl = (request: Request): string => {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
};

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
  const canonicalInput = { ...parsed.data, trace_id };

  try {
    const slipText = draftSlipToCanonicalSlipText(canonicalInput);
    const resolvedTraceId = await runSlip(slipText, { trace_id, requestTraceId: trace_id, baseUrl: requestBaseUrl(request) });
    const run = await runStore.getRun(resolvedTraceId);
    if (!run) throw new Error('Run not found after persistence.');
    const runDto = toResearchRunDTOFromRun(run);

    return NextResponse.json({
      trace_id: resolvedTraceId,
      spine: { ...spine, trace_id: resolvedTraceId },
      run: runDto,
      events_written: true
    });
  } catch {
    const result = await runStressTest({ trace_id, spine: { ...spine, trace_id }, legs: parsed.data.legs });

    return NextResponse.json({
      trace_id,
      spine: { ...spine, trace_id },
      analysis: result.analysis,
      events_written: result.events_written,
      degraded: true,
      degraded_reason: 'canonical_run_failed'
    });
  }
}
