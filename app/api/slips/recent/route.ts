import { NextResponse } from 'next/server';

import { coerceContextSpine, spineFromRequest, type ContextSpine } from '@/src/core/contracts/contextSpine';
import { ensureTraceMeta } from '@/src/core/contracts/trace';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';

const extractTitle = (rawText: string): string => {
  const first = rawText.split('\n').map((line) => line.trim()).find(Boolean) ?? 'Recent slip';
  return first.length > 72 ? `${first.slice(0, 69)}...` : first;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit') ?? 2);
  const anonId = searchParams.get('anon_id') ?? searchParams.get('anon_session_id') ?? undefined;
  const userId = searchParams.get('user_id') ?? undefined;
  const requestSpine = spineFromRequest(request);

  const slips = await getRuntimeStore().listSlipSubmissions({
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 10) : 2,
    anonSessionId: userId ? undefined : anonId,
    userId,
  });

  return NextResponse.json({
    slips: slips.map((slip) => {
      const spine: ContextSpine = coerceContextSpine(
        {
          sport: requestSpine.sport,
          tz: requestSpine.tz,
          date: requestSpine.date,
          mode: requestSpine.mode,
          reason: requestSpine.reason,
          trace_id: slip.traceId,
          anon_session_id: slip.anonSessionId ?? undefined,
          slip_id: slip.id,
        },
        {
          sport: 'NBA',
          tz: 'America/Phoenix',
          date: new Date(slip.createdAt).toISOString().slice(0, 10),
          mode: 'demo',
          trace_id: slip.traceId,
          anon_session_id: slip.anonSessionId ?? undefined,
          slip_id: slip.id,
        }
      );

      const trace = ensureTraceMeta(spine, 'pipeline', slip.traceId);

      return {
        id: slip.id,
        title: extractTitle(slip.rawText),
        note: `${slip.parseStatus === 'parsed' ? 'Parsed' : 'Submitted'} · ${new Date(slip.createdAt).toLocaleString()}`,
        trace_id: slip.traceId,
        created_at: slip.createdAt,
        spine,
        trace,
      };
    })
  });
}
