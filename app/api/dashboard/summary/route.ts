import { NextResponse } from 'next/server';

import { buildInsights, summarizeBets } from '@/src/core/persistence/dashboard';
import { getRuntimeStore } from '@/src/core/persistence/runtimeStoreProvider';

export const dynamic = 'force-dynamic';
export async function GET() {
  const store = getRuntimeStore();
  const bets = await store.listBets();
  const summary = summarizeBets(bets);
  return NextResponse.json({ ...summary, insights: buildInsights(bets) });
}
