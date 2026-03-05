import { NextResponse } from 'next/server';

import { runOddsProbe, type OddsProbeTarget } from '@/src/core/providers/oddsProbe.server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetParam = searchParams.get('target');
  const target: OddsProbeTarget = targetParam === 'sports_list' ? 'sports_list' : 'today_odds_fetch';
  const sport = searchParams.get('sport') ?? 'NBA';
  const result = await runOddsProbe({ target, sport });
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
