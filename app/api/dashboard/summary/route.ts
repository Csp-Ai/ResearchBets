import { NextResponse } from 'next/server';

import { buildInsights, summarizeBets } from '@/src/core/persistence/dashboard';
import { persistenceDb } from '@/src/core/persistence/runtimeDb';

export async function GET() {
  const summary = summarizeBets(persistenceDb.bets);
  return NextResponse.json({ ...summary, insights: buildInsights(persistenceDb.bets) });
}
