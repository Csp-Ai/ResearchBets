import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import {
  emitLivePageEvent,
  getCachedQuickModel,
  recordMarketLoaded
} from '@/src/core/live/liveModel';
import { MarketSnapshotSchema } from '@/src/core/contracts/terminalSchemas';
import { getMarketSnapshot } from '@/src/core/markets/marketData';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get('sport') ?? 'NFL';
  const traceId = searchParams.get('trace_id') ?? randomUUID();
  const runId = `live_market_${randomUUID()}`;
  const snapshotResult = MarketSnapshotSchema.safeParse(await getMarketSnapshot({ sport }));
  if (!snapshotResult.success) {
    const fallbackSnapshot = MarketSnapshotSchema.safeParse(await getMarketSnapshot({ sport: 'NFL' }));
    return NextResponse.json({
      ok: false,
      error_code: 'schema_invalid',
      source: 'demo',
      degraded: true,
      snapshot: fallbackSnapshot.success ? fallbackSnapshot.data : null
    });
  }
  const snapshot = snapshotResult.data;

  await recordMarketLoaded({
    games: snapshot.games,
    traceId,
    runId,
    sport,
    source: snapshot.source
  });
  await emitLivePageEvent({ eventName: 'live_games_opened', traceId, runId, sport });

  const games = snapshot.games.map((game) => ({
    ...game,
    model: getCachedQuickModel(game.gameId)
  }));

  return NextResponse.json({
    ok: true,
    trace_id: traceId,
    run_id: runId,
    snapshot: { ...snapshot, games }
  });
}
