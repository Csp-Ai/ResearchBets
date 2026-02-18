import { NextResponse } from 'next/server';

import { searchGames } from '@/src/core/games/catalog';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') ?? '';
  const games = searchGames(query);
  return NextResponse.json({ ok: true, games, degraded: games.length > 0 && query.length > 0 && !games.some((item) => item.gameId.toLowerCase().includes(query.toLowerCase())), source: games.some((item) => item.source === 'demo') ? 'demo' : 'live' });
}
