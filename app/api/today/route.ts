import { NextResponse } from 'next/server';

import { fallbackToday } from '@/src/core/today/fallback';
import { normalizeTodayPayload } from '@/src/core/today/normalize';
import { getTodayPayload } from '@/src/core/today/service.server';

const LIVE_SPORTS = ['NBA', 'NFL', 'NHL', 'MLB', 'UFC'] as const;

type LiveSport = (typeof LIVE_SPORTS)[number];

const readSport = (value: string | null): LiveSport => {
  const upper = (value ?? 'NBA').toUpperCase();
  return (LIVE_SPORTS.includes(upper as LiveSport) ? upper : 'NBA') as LiveSport;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === '1';
  const demoRequested = searchParams.get('demo') === '1';
  const sport = readSport(searchParams.get('sport'));
  const tz = searchParams.get('tz') ?? 'America/Phoenix';
  const date = searchParams.get('date') ?? searchParams.get('dateISO') ?? undefined;
  const headerLiveMode = request.headers.get('x-live-mode') === '1';

  try {
    if (headerLiveMode && !process.env.SPORTSDATAIO_API_KEY && !process.env.THEODDS_API_KEY) {
      return NextResponse.json({
        ...fallbackToday({ sport, tz, date, mode: 'demo' }),
        mode: 'demo',
        reason: 'fallback_due_to_missing_keys'
      });
    }

    const payload = await getTodayPayload({ forceRefresh, demoRequested, sport, tz, date });
    const normalized = normalizeTodayPayload(payload);
    return NextResponse.json(normalized);
  } catch {
    return NextResponse.json({
      ...fallbackToday({ sport, tz, date, mode: 'demo' }),
      mode: 'demo',
      reason: 'fallback_due_to_provider_unavailable'
    });
  }
}
