import { NextResponse } from 'next/server';

import { GovernorReportSchema } from '@/src/core/contracts/envelopes';
import { getTraceContext } from '@/src/core/trace/getTraceContext.server';
import { runGovernor } from '@/src/core/governor/runGovernor.server';

const EMPTY_SLIP_ID = '00000000-0000-0000-0000-000000000000';

export async function GET(request: Request) {
  const trace = getTraceContext(request);
  try {
    const report = await runGovernor({
      trace_id: trace.trace_id,
      todayPayload: {
        mode: trace.mode === 'live' ? 'live' : 'demo',
        games: [{ id: 'g-1', matchup: 'A @ B', startTime: new Date().toISOString() }],
        board: [{ id: 'p-1', gameId: 'g-1', player: 'Player', market: 'points', line: '20.5', odds: '-110' }],
      },
      slipSubmitResult: {
        slip_id: EMPTY_SLIP_ID,
        trace_id: trace.trace_id,
        anon_id: 'anon',
        spine: { sport: trace.sport, tz: trace.tz, date: trace.date, mode: trace.mode },
        trace: { trace_id: trace.trace_id, mode: trace.mode, provenance: 'user' },
        parse: { confidence: 0.8, legs_count: 1, needs_review: false },
      },
      slipExtractResult: {
        slip_id: EMPTY_SLIP_ID,
        extracted_legs: [{ id: 'leg-1' }],
        leg_insights: [{ message: 'ok' }],
        trace_id: trace.trace_id,
      },
      boundaryViolations: [],
    });
    return NextResponse.json(GovernorReportSchema.parse(report));
  } catch {
    return NextResponse.json(GovernorReportSchema.parse({
      ok: false,
      trace_id: trace.trace_id,
      checks: [{ id: 'GovernorRoute', level: 'warn', pass: false, message: 'Governor degraded report returned.' }],
    }));
  }
}
