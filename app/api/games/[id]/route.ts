import { NextResponse } from 'next/server';

import { resolveGameFromRegistry } from '@/src/core/games/registry';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const game = resolveGameFromRegistry(params.id);
  if (!game) return NextResponse.json({ ok: false, error_code: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true, game, source: game.source });
}
