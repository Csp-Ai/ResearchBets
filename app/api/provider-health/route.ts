import { NextResponse } from 'next/server';

import { getBoardData } from '@/src/core/board/boardService.server';
import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { getLiveKeyStatus } from '@/src/core/live/modeResolver.server';

const timeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('provider_timeout')), timeoutMs));
  return Promise.race([promise, timeoutPromise]);
};

async function emitFallbackEvent(providerErrors: string[], startedAt: number) {
  await new DbEventEmitter().emit({
    event_name: 'live_poll_degraded',
    timestamp: new Date().toISOString(),
    request_id: 'provider-health',
    trace_id: 'provider-health',
    agent_id: 'provider-health',
    model_version: 'v1',
    properties: {
      providerErrors,
      latency_bucket: Date.now() - startedAt > 2000 ? 'slow' : 'fast'
    }
  });
}

export async function GET() {
  const startedAt = Date.now();
  const keyStatus = getLiveKeyStatus();
  const checks = {
    odds: 'unknown' as 'ok' | 'error' | 'unknown',
    stats: process.env.SPORTSDATA_API_KEY || process.env.SPORTSDATAIO_API_KEY ? 'configured' : 'missing',
    liveModeEnv: process.env.LIVE_MODE ?? 'unset'
  };

  try {
    const board = await timeout(getBoardData({ sport: 'NBA', tz: 'America/Phoenix' }), 3500);
    checks.odds = board.mode === 'live' ? 'ok' : 'error';
    if (keyStatus.requiredKeysPresent && keyStatus.liveModeEnabled && board.mode !== 'live') {
      await emitFallbackEvent(board.providerErrors ?? ['provider_unavailable'], startedAt);
    }
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
    await emitFallbackEvent([error instanceof Error ? error.message : 'provider_unavailable'], startedAt);
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
