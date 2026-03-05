import { NextResponse } from 'next/server';

import { getBoardData } from '@/src/core/board/boardService.server';
import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { ALIAS_KEYS, CANONICAL_KEYS } from '@/src/core/env/keys';
import { readString, resolveWithAliases } from '@/src/core/env/read.server';
import { getLiveKeyStatus } from '@/src/core/live/modeResolver.server';
import { runOddsProbe, type OddsReasonCode } from '@/src/core/providers/oddsProbe.server';

export const runtime = 'nodejs';

type OddsCheck = {
  provider: 'odds';
  ok: boolean;
  reason: OddsReasonCode | null;
  statusCode: number | null;
  resolvedBaseHost: string | null;
  runtime: 'nodejs';
  errorName: string | null;
  errorCode: string | null;
  safeMessage: string | null;
};

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
  const oddsProbe = await runOddsProbe();

  const checks = {
    odds: {
      provider: 'odds',
      ok: oddsProbe.ok,
      reason: oddsProbe.reason,
      statusCode: oddsProbe.status,
      resolvedBaseHost: oddsProbe.resolvedBaseHost,
      runtime,
      errorName: oddsProbe.errorName,
      errorCode: oddsProbe.errorCode,
      safeMessage: oddsProbe.safeMessage
    } as OddsCheck,
    stats: resolveWithAliases(CANONICAL_KEYS.SPORTSDATA_API_KEY, ALIAS_KEYS[CANONICAL_KEYS.SPORTSDATA_API_KEY]) ? 'configured' : 'missing',
    liveModeEnv: readString(CANONICAL_KEYS.LIVE_MODE) ?? 'unset'
  };

  if (!oddsProbe.ok) {
    return NextResponse.json({
      ok: false,
      keyStatus,
      checks,
      mode: 'demo',
      reason: 'provider_unavailable',
      providerErrors: [oddsProbe.safeMessage],
      runtime,
      nodeEnv: process.env.NODE_ENV ?? 'development',
      vercelEnv: process.env.VERCEL_ENV ?? 'unset'
    });
  }

  try {
    const board = await timeout(getBoardData({ sport: 'NBA', tz: 'America/Phoenix' }), 3500);

    if (keyStatus.requiredKeysPresent && keyStatus.liveModeEnabled && board.mode !== 'live') {
      await emitFallbackEvent(board.providerErrors ?? ['provider_unavailable'], startedAt);
    }

    return NextResponse.json({
      ok: board.mode === 'live',
      keyStatus,
      checks,
      mode: board.mode,
      reason: board.mode === 'live' ? board.reason : 'provider_unavailable',
      providerErrors: board.mode === 'live' ? board.providerErrors : [oddsProbe.safeMessage],
      runtime,
      nodeEnv: process.env.NODE_ENV ?? 'development',
      vercelEnv: process.env.VERCEL_ENV ?? 'unset'
    });
  } catch (error) {
    const eventMessage = error instanceof Error ? error.message : 'provider_unavailable';
    await emitFallbackEvent([eventMessage], startedAt);
    return NextResponse.json({
      ok: false,
      keyStatus,
      checks,
      mode: 'demo',
      reason: 'provider_unavailable',
      providerErrors: [oddsProbe.safeMessage],
      runtime,
      nodeEnv: process.env.NODE_ENV ?? 'development',
      vercelEnv: process.env.VERCEL_ENV ?? 'unset'
    });
  }
}
