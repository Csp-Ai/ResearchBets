import 'server-only';

import { NextResponse } from 'next/server';

import { getServerEnv } from '@/src/core/env/server';
import { settlePendingBets } from '@/src/core/bettor/settlePendingBets';

export async function POST(request: Request) {
  const env = getServerEnv();

  if (env.nodeEnv === 'production' && env.vercel !== '1') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const secret = request.headers.get('x-cron-secret');
  if (!env.cronSecret || secret !== env.cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await settlePendingBets(100);
    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ error: 'Unable to settle bets.' }, { status: 500 });
  }
}
