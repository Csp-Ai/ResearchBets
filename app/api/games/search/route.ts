import { NextResponse } from 'next/server';

import { resolveTraceId, successEnvelope } from '../../../../src/core/api/envelope';
import { searchGamesInRegistry } from '../../../../src/core/games/registry';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') ?? '';
  const traceId = resolveTraceId(request);
  const games = searchGamesInRegistry(query);
  const degraded =
    games.length > 0 &&
    query.length > 0 &&
    !games.some((item) => item.gameId.toLowerCase().includes(query.toLowerCase()));
  const source = games.some((item) => item.source === 'demo') ? 'demo' : 'live';

  return NextResponse.json(
    successEnvelope({
      traceId,
      data: { games },
      degraded,
      source
    })
  );
}
