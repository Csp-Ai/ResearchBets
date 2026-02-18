import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getOrRunQuickModel } from '@/src/core/live/liveModel';
import { getMarketSnapshot } from '@/src/core/markets/marketData';

const bodySchema = z.object({
  gameId: z.string().min(1),
  sport: z.string().min(1),
  traceId: z.string().min(1).optional()
});

export async function POST(request: Request) {
  const body = bodySchema.parse(await request.json());
  const snapshot = await getMarketSnapshot({ sport: body.sport });
  const game = snapshot.games.find((item) => item.gameId === body.gameId);
  if (!game)
    return NextResponse.json(
      { ok: false, error_code: 'game_not_found', source: 'demo' },
      { status: 404 }
    );

  const model = await getOrRunQuickModel({ game, traceId: body.traceId ?? randomUUID() });
  return NextResponse.json({ ok: true, data: model, source: model.source, degraded: false });
}
