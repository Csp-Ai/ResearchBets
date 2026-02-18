import { NextResponse } from 'next/server';

import { resolveGameById } from '@/src/core/games/catalog';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const game = resolveGameById(params.id);
  if (!game) return NextResponse.json({ ok: false, error_code: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true, game, source: game.source });
}
