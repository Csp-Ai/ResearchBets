import { NextResponse } from 'next/server';

import { getTodayPayload } from '@/src/core/today/service.server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === '1';
  const demoRequested = searchParams.get('demo') === '1';
  const sportParam = (searchParams.get('sport') ?? 'NBA').toUpperCase();
  const sport = (['NBA', 'NFL', 'NHL', 'MLB', 'UFC'].includes(sportParam) ? sportParam : 'NBA') as 'NBA' | 'NFL' | 'NHL' | 'MLB' | 'UFC';
  const tz = searchParams.get('tz') ?? 'America/Phoenix';
  const date = searchParams.get('date') ?? undefined;
  const payload = await getTodayPayload({ forceRefresh, demoRequested, sport, tz, date });
  return NextResponse.json(payload);
}
