import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

import { InMemoryEventEmitter } from '@/src/core/control-plane/emitter';
import { refreshOddsSnapshotIfStale } from '@/src/core/measurement/odds';

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');
  const sourceUrl = searchParams.get('sourceUrl');
  const market = searchParams.get('market') ?? 'spread';
  const selection = searchParams.get('selection') ?? 'home';
  const book = searchParams.get('book') ?? 'unknown_book';
  const marketType = (searchParams.get('marketType') ?? 'spread') as 'spread' | 'total' | 'moneyline';

  if (!gameId || !sourceUrl) {
    return NextResponse.json({ error: 'gameId and sourceUrl are required' }, { status: 400 });
  }

  const emitter = new InMemoryEventEmitter();
  const result = await refreshOddsSnapshotIfStale(
    {
      sourceUrl,
      gameId,
      market,
      marketType,
      selection,
      book,
      requestContext: {
        requestId: randomUUID(),
        traceId: randomUUID(),
        runId: randomUUID(),
        sessionId: 'odds_refresh_api',
        userId: 'system',
        agentId: 'wal_refresh_service',
        modelVersion: 'wal-v2',
      },
    },
    emitter,
  );

  return NextResponse.json({ ...result, events_emitted: emitter.getEvents().map((item: { event_name: string }) => item.event_name) });
}
