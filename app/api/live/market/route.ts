import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { resolveTraceId, successEnvelope } from '../../../../src/core/api/envelope';
import { normalizeSpine } from '../../../../src/core/nervous/spine';
import { ensureTraceId } from '../../../../src/core/trace/trace_id';
import { MarketSnapshotSchema } from '../../../../src/core/contracts/terminalSchemas';
import {
  emitLivePageEvent,
  getCachedQuickModel,
  recordMarketLoaded
} from '../../../../src/core/live/liveModel';
import { getMarketSnapshot } from '../../../../src/core/markets/marketData';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport') ?? 'NFL';
    const requestedTraceId = resolveTraceId(request);
  const { trace_id: traceId } = ensureTraceId(normalizeSpine({ trace_id: requestedTraceId ?? undefined }));
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

    return NextResponse.json(
      successEnvelope({
        traceId,
        data: {
          run_id: runId,
          snapshot: { ...snapshot, games }
        },
        degraded: snapshot.degraded,
        source: snapshot.source
      })
    );
  } catch {
    return NextResponse.json({ ok: false, error_code: 'market_unavailable', source: 'demo', degraded: true, data: null });
  }
}
