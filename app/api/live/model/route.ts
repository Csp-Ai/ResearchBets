import { NextResponse } from 'next/server';
import { z } from 'zod';

import { errorEnvelope, resolveTraceId, successEnvelope } from '../../../../src/core/api/envelope';
import { normalizeSpine } from '../../../../src/core/nervous/spine';
import { ensureTraceId } from '../../../../src/core/trace/trace_id';
import { getOrRunQuickModel } from '../../../../src/core/live/liveModel';
import { getMarketSnapshot } from '../../../../src/core/markets/marketData';

const bodySchema = z.object({
  gameId: z.string().min(1),
  sport: z.string().min(1),
  traceId: z.string().min(1).optional()
});

export async function POST(request: Request) {
  const body = bodySchema.parse(await request.json());
  const requestedTraceId = resolveTraceId(request, body.traceId);
  const { trace_id: traceId } = ensureTraceId(normalizeSpine({ trace_id: requestedTraceId ?? undefined }));
  const snapshot = await getMarketSnapshot({ sport: body.sport });
  const game = snapshot.games.find((item) => item.gameId === body.gameId);
  if (!game)
    return NextResponse.json(
      errorEnvelope({ traceId, errorCode: 'game_not_found', source: 'demo' }),
      { status: 404 }
    );

  const model = await getOrRunQuickModel({ game, traceId });
  return NextResponse.json(
    successEnvelope({
      traceId,
      data: model,
      source: model.source,
      degraded: false
    })
  );
}
