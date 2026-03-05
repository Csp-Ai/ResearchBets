import 'server-only';

import { NextResponse } from 'next/server';

import { getServerEnv } from '@/src/core/env/server';
import { coerceIsoDate } from '@/src/core/nervous/spine';
import { resolveToday } from '@/src/core/today/resolveToday.server';

type WarmResult = {
  sport: 'NBA';
  tz: 'America/Phoenix';
  date: string;
  mode: string;
  reason?: string;
};

function isAuthorized(request: Request, cronSecret: string | null): boolean {
  if (!cronSecret) return false;
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get('secret');
  const headerSecret = request.headers.get('x-cron-secret');
  return querySecret === cronSecret || headerSecret === cronSecret;
}

export async function POST(request: Request) {
  const env = getServerEnv();
  if (!isAuthorized(request, env.cronSecret)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const tz: WarmResult['tz'] = 'America/Phoenix';
  const date = coerceIsoDate(undefined, tz);
  const targets: Array<{ sport: WarmResult['sport']; tz: WarmResult['tz']; date: string }> = [{ sport: 'NBA', tz, date }];

  const warmed: WarmResult[] = [];
  const errors: string[] = [];

  for (const target of targets) {
    try {
      const payload = await resolveToday({
        mode: 'live',
        forceRefresh: true,
        sport: target.sport,
        tz: target.tz,
        date: target.date,
      });
      warmed.push({ sport: target.sport, tz: target.tz, date: target.date, mode: payload.mode, reason: payload.reason });
    } catch (error) {
      errors.push(`${target.sport}:${target.tz}:${target.date}:${error instanceof Error ? error.message : 'unknown_error'}`);
    }
  }

  return NextResponse.json({ ok: errors.length === 0, warmed, errors });
}
