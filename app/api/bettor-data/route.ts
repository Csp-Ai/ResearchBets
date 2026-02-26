import { NextResponse } from 'next/server';

import { getBettorData } from '@/src/core/bettor/gateway.server';

export async function GET(request: Request) {
  const liveHeader = request.headers.get('x-live-mode');
  const liveModeOverride = liveHeader === 'true' ? true : liveHeader === 'false' ? false : undefined;
  const { searchParams } = new URL(request.url);
  const sportParam = (searchParams.get('sport') ?? 'NBA').toUpperCase();
  const sport = (['NBA', 'NFL', 'NHL', 'MLB', 'UFC'].includes(sportParam) ? sportParam : 'NBA') as 'NBA' | 'NFL' | 'NHL' | 'MLB' | 'UFC';
  const tz = searchParams.get('tz') ?? 'America/Phoenix';
  const date = searchParams.get('date') ?? undefined;
  const demoRequested = searchParams.get('demo') === '1';
  const payload = await getBettorData({ liveModeOverride, sport, tz, date, demoRequested });
  return NextResponse.json(payload);
}
