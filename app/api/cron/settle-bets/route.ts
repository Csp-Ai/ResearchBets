import 'server-only';

import { NextResponse } from 'next/server';

import { settlePendingBets } from '@/src/core/bettor/settlePendingBets';

export async function POST(request: Request) {
  const secret = request.headers.get('x-cron-secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await settlePendingBets(100);
    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ error: 'Unable to settle bets.' }, { status: 500 });
  }
}
