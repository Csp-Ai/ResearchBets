import { NextResponse } from 'next/server';

import { DbEventEmitter } from '@/src/core/control-plane/emitter';
import { getRuntimeContext } from '@/src/core/env/runtimeContext.server';
import { ALIAS_KEYS, CANONICAL_KEYS } from '@/src/core/env/keys';
import { readString, resolveWithAliases } from '@/src/core/env/read.server';
import { getLiveKeyStatus } from '@/src/core/live/modeResolver.server';
import { runEventsProbe } from '@/src/core/providers/eventsProbe.server';
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

async function emitFallbackEvent(providerErrors: string[], startedAt: number) {
  try {
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
  } catch {
    // Non-blocking diagnostics only.
  }
}

export async function GET() {
  const startedAt = Date.now();
  const runtimeContext = getRuntimeContext();
  const keyStatus = getLiveKeyStatus();
  const oddsProbe = await runOddsProbe();
  const eventsProbe = await runEventsProbe({ sport: 'NBA' });
  const statsConfigured = Boolean(resolveWithAliases(CANONICAL_KEYS.SPORTSDATA_API_KEY, ALIAS_KEYS[CANONICAL_KEYS.SPORTSDATA_API_KEY]));

  const checks = {
    odds: {
      provider: 'odds',
      ok: oddsProbe.ok,
      reason: oddsProbe.ok ? null : oddsProbe.reason,
      statusCode: oddsProbe.status,
      resolvedBaseHost: oddsProbe.resolvedBaseHost,
      runtime,
      errorName: oddsProbe.errorName,
      errorCode: oddsProbe.errorCode,
      safeMessage: oddsProbe.safeMessage
    } as OddsCheck,
    events: {
      provider: 'odds',
      ok: eventsProbe.ok,
      reason: eventsProbe.ok ? null : eventsProbe.reason,
      statusCode: eventsProbe.status,
      resolvedBaseHost: eventsProbe.resolvedBaseHost,
      safeMessage: eventsProbe.safeMessage,
      ...(eventsProbe.safeDetail ? { safeDetail: eventsProbe.safeDetail } : {}),
    },
    stats: statsConfigured ? 'configured' : 'missing',
    liveModeEnv: readString(CANONICAL_KEYS.LIVE_MODE) ?? 'unset'
  };

  const providerErrors: string[] = [];
  const messages: string[] = [];

  if (!oddsProbe.ok && oddsProbe.safeMessage) {
    providerErrors.push(oddsProbe.safeMessage);
  } else if (oddsProbe.ok && oddsProbe.safeMessage) {
    messages.push(oddsProbe.safeMessage);
  }

  if (!eventsProbe.ok && eventsProbe.safeMessage) {
    providerErrors.push(eventsProbe.safeMessage);
    if (eventsProbe.safeDetail && eventsProbe.safeDetail.length <= 120) {
      providerErrors.push(eventsProbe.safeDetail);
    }
  } else if (eventsProbe.ok && eventsProbe.safeMessage) {
    messages.push(eventsProbe.safeMessage);
  }

  if (!keyStatus.requiredKeysPresent) {
    providerErrors.push('Required live provider keys are missing');
  }

  if (!keyStatus.liveModeEnabled) {
    providerErrors.push('LIVE_MODE is disabled');
  }

  if (!statsConfigured) {
    providerErrors.push('Sports data provider key is missing');
  }

  const ok = keyStatus.requiredKeysPresent
    && keyStatus.liveModeEnabled
    && checks.odds.ok
    && checks.events.ok
    && checks.stats === 'configured';
  const mode = ok ? 'live' : 'demo';
  const reason = ok ? 'live_ok' : (checks.odds.ok && !checks.events.ok ? 'live_degraded_events' : 'provider_unavailable');

  if (!ok && providerErrors.length > 0) {
    await emitFallbackEvent(providerErrors, startedAt);
  }

  return NextResponse.json({
    ok,
    keyStatus,
    checks,
    mode,
    reason,
    providerErrors,
    ...(messages.length > 0 ? { messages } : {}),
    runtime,
    runtimeContext,
    nodeEnv: runtimeContext.nodeEnv,
    vercelEnv: runtimeContext.vercelEnv,
    isVercelProd: runtimeContext.isVercelProd
  });
}
