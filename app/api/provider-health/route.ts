import { NextResponse } from 'next/server';

import { getBoardData } from '@/src/core/board/boardService.server';
import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { ALIAS_KEYS, CANONICAL_KEYS } from '@/src/core/env/keys';
import { readString, resolveWithAliases } from '@/src/core/env/read.server';
import { getLiveKeyStatus } from '@/src/core/live/modeResolver.server';

type OddsReasonCode = 'http_401' | 'http_403' | 'http_429' | 'timeout' | 'dns' | 'bad_base_url' | 'unknown';

type OddsCheck = {
  provider: 'odds';
  ok: boolean;
  reason: OddsReasonCode | null;
  statusCode: number | null;
};

const timeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('provider_timeout')), timeoutMs));
  return Promise.race([promise, timeoutPromise]);
};

const deriveOddsError = (message: string | undefined): { reason: OddsReasonCode; statusCode: number | null; safeMessage: string } => {
  const source = (message ?? '').toLowerCase();
  const statusMatch = source.match(/\b(401|403|429)\b/);
  if (statusMatch) {
    const code = Number(statusMatch[1]);
    if (code === 401) return { reason: 'http_401', statusCode: 401, safeMessage: 'Unauthorized response from odds provider' };
    if (code === 403) return { reason: 'http_403', statusCode: 403, safeMessage: 'Forbidden response from odds provider' };
    if (code === 429) return { reason: 'http_429', statusCode: 429, safeMessage: 'Rate limited by odds provider' };
  }
  if (source.includes('timeout') || source.includes('timed out')) {
    return { reason: 'timeout', statusCode: null, safeMessage: 'Odds provider request timed out' };
  }
  if (source.includes('enotfound') || source.includes('eai_again') || source.includes('dns')) {
    return { reason: 'dns', statusCode: null, safeMessage: 'DNS resolution failed for odds provider' };
  }
  if (source.includes('invalid url') || source.includes('bad base url') || source.includes('failed to parse url')) {
    return { reason: 'bad_base_url', statusCode: null, safeMessage: 'Odds provider base URL is invalid' };
  }

  return { reason: 'unknown', statusCode: null, safeMessage: 'Odds provider unavailable' };
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
    odds: {
      provider: 'odds',
      ok: false,
      reason: 'unknown',
      statusCode: null,
    } as OddsCheck,
    stats: resolveWithAliases(CANONICAL_KEYS.SPORTSDATA_API_KEY, ALIAS_KEYS[CANONICAL_KEYS.SPORTSDATA_API_KEY]) ? 'configured' : 'missing',
    liveModeEnv: readString(CANONICAL_KEYS.LIVE_MODE) ?? 'unset'
  };

  try {
    const board = await timeout(getBoardData({ sport: 'NBA', tz: 'America/Phoenix' }), 3500);
    const primaryProviderError = board.providerErrors?.[0];
    const derived = deriveOddsError(primaryProviderError);

    checks.odds = {
      provider: 'odds',
      ok: board.mode === 'live',
      reason: board.mode === 'live' ? null : derived.reason,
      statusCode: board.mode === 'live' ? null : derived.statusCode,
    };

    if (keyStatus.requiredKeysPresent && keyStatus.liveModeEnabled && board.mode !== 'live') {
      await emitFallbackEvent(board.providerErrors ?? ['provider_unavailable'], startedAt);
    }

    return NextResponse.json({
      ok: board.mode === 'live',
      keyStatus,
      checks,
      mode: board.mode,
      reason: board.mode === 'live' ? board.reason : 'provider_unavailable',
      providerErrors: board.mode === 'live' ? board.providerErrors : [derived.safeMessage],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : undefined;
    const derived = deriveOddsError(message);
    checks.odds = { provider: 'odds', ok: false, reason: derived.reason, statusCode: derived.statusCode };

    await emitFallbackEvent([message ?? 'provider_unavailable'], startedAt);
    return NextResponse.json({
      ok: false,
      keyStatus,
      checks,
      mode: 'demo',
      reason: 'provider_unavailable',
      providerErrors: [derived.safeMessage]
    });
  }
}
