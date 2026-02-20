import { NextResponse } from 'next/server';

import { historyStore } from '@/src/core/bettor/historyStore';

export async function GET() {
  return NextResponse.json({ bets: historyStore.list() });
}

export async function POST(request: Request) {
  const payload = await request.json() as { slipText?: string; closingLine?: string; outcome?: 'win' | 'loss'; placedAt?: string };
  if (!payload.slipText || !payload.outcome) {
    return NextResponse.json({ error: 'slipText and outcome required' }, { status: 400 });
  }
  historyStore.add({
    id: crypto.randomUUID(),
    slipText: payload.slipText,
    closingLine: payload.closingLine,
    outcome: payload.outcome,
    placedAt: payload.placedAt ?? new Date().toISOString()
  });
  return NextResponse.json({ ok: true });
}
