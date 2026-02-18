import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { errorEnvelope, resolveTraceId, successEnvelope } from '../../../../../src/core/api/envelope';
import { emitLivePageEvent, getCachedQuickModel } from '../../../../../src/core/live/liveModel';
import { getPlayerPropsMomentum } from '../../../../../src/core/live/playerProps';
import { resolveGameFromRegistry } from '../../../../../src/core/games/registry';
import { getMarketSnapshot } from '../../../../../src/core/markets/marketData';

export async function GET(request: Request, { params }: { params: { gameId: string } }) {
  const { searchParams } = new URL(request.url);
  const registryGame = resolveGameFromRegistry(params.gameId);
  const sport = searchParams.get('sport') ?? registryGame?.league ?? 'NFL';
  const traceId = resolveTraceId(request);
  const runId = `live_game_${randomUUID()}`;

  const snapshotResult = MarketSnapshotSchema.safeParse(await getMarketSnapshot({ sport }));
  if (!snapshotResult.success) {
    const fallbackSnapshot = MarketSnapshotSchema.safeParse(await getMarketSnapshot({ sport: 'NFL' }));
    const fallbackGame = fallbackSnapshot.success
      ? fallbackSnapshot.data.games.find((item) => item.gameId === params.gameId) ?? null
      : null;
    return NextResponse.json({
      ok: false,
      error_code: 'schema_invalid',
      source: 'demo',
      degraded: true,
      game: fallbackGame,
      model: fallbackGame ? getCachedQuickModel(fallbackGame.gameId) : null,
      props: fallbackGame ? getPlayerPropsMomentum(fallbackGame.gameId, fallbackGame.sport) : []
    });
  }

  const snapshot = snapshotResult.data;
  const game = snapshot.games.find((item) => item.gameId === params.gameId);
  if (!game)
    return NextResponse.json(
      errorEnvelope({ traceId, errorCode: 'game_not_found', source: 'demo' }),
      { status: 404 }
    );

  await emitLivePageEvent({
    eventName: 'live_game_opened',
    traceId,
    runId,
    gameId: game.gameId,
    sport
  });

  return NextResponse.json(
    successEnvelope({
      traceId,
      data: {
        run_id: runId,
        game,
        model: getCachedQuickModel(game.gameId),
        props: getPlayerPropsMomentum(game.gameId, sport)
      },
      degraded: game.degraded,
      source: game.source
    })
  );
}
