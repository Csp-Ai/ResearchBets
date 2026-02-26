import { NextResponse } from 'next/server';

import { getBoardData } from '@/src/core/board/boardService.server';
import { getLiveKeyStatus } from '@/src/core/live/modeResolver.server';

const timeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('provider_timeout')), timeoutMs));
  return Promise.race([promise, timeoutPromise]);
};

export async function GET() {
  const keyStatus = getLiveKeyStatus();
  const checks = {
    odds: 'unknown' as 'ok' | 'error' | 'unknown',
    stats: process.env.SPORTSDATA_API_KEY ? 'configured' : 'missing',
    liveModeEnv: process.env.LIVE_MODE ?? 'unset'
  };

  try {
    const board = await timeout(getBoardData({ sport: 'NBA', tz: 'America/Phoenix' }), 3500);
    checks.odds = board.mode === 'live' ? 'ok' : 'error';
    return NextResponse.json({
      ok: board.mode === 'live',
      keyStatus,
      checks,
      mode: board.mode,
      reason: board.reason,
      providerErrors: board.providerErrors
    });
  } catch (error) {
    checks.odds = 'error';
    return NextResponse.json({
      ok: false,
      keyStatus,
      checks,
      mode: 'demo',
      reason: 'provider_unavailable',
      providerErrors: [error instanceof Error ? error.message : 'provider_unavailable']
    });
  }
}
