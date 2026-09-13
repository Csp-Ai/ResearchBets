import { NextResponse } from 'next/server';

import { scanTodayIdeas } from '@/src/core/ideas/todayIdeas.server';
import { coerceIsoDate } from '@/src/core/nervous/spine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeZone = searchParams.get('tz') || 'America/Phoenix';
  const rawDate = searchParams.get('date') || undefined;
  const date = coerceIsoDate(rawDate, timeZone);
  const requestedSport = (searchParams.get('sport') || 'NFL').toUpperCase();

  if (requestedSport !== 'NFL') {
    return NextResponse.json(
      {
        ok: false,
        error: 'sport_not_supported_yet',
        message: 'Today Ideas v1 currently supports NFL.',
      },
      { status: 400 },
    );
  }

  try {
    const result = await scanTodayIdeas({
      date,
      timeZone,
      sport: 'NFL',
      limit: 12,
    });

    return NextResponse.json(
      { ok: true, data: result },
      {
        headers: {
          'Cache-Control': 'private, max-age=0, s-maxage=45, stale-while-revalidate=120',
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'today_ideas_unavailable',
        message: 'Live market ideas are temporarily unavailable.',
      },
      { status: 503 },
    );
  }
}
