import 'server-only';

import { ALIAS_KEYS, CANONICAL_KEYS } from '@/src/core/env/keys';
import { readString, resolveWithAliases } from '@/src/core/env/read.server';
import { getLiveKeyStatus } from '@/src/core/live/modeResolver.server';
import type { ProviderHealthSummary } from '@/src/core/live/runtimeMode';
import { runEventsProbe } from '@/src/core/providers/eventsProbe.server';
import { runOddsProbe, type OddsReasonCode } from '@/src/core/providers/oddsProbe.server';

export type ProviderHealthCheckSummary = {
  odds: {
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
  events: {
    provider: 'odds';
    ok: boolean;
    reason: string | null;
    statusCode: number | null;
    resolvedBaseHost: string | null;
    safeMessage: string | null;
    safeDetail?: string;
  };
  stats: 'configured' | 'missing';
  liveModeEnv: string;
};

export type ComputedProviderHealth = Omit<ProviderHealthSummary, 'providerErrors'> & {
  ok: boolean;
  keyStatus: ReturnType<typeof getLiveKeyStatus>;
  checks: ProviderHealthCheckSummary;
  providerErrors: string[];
  messages: string[];
};

export async function computeProviderHealth({ sport = 'NBA' }: { sport?: string }): Promise<ComputedProviderHealth> {
  const keyStatus = getLiveKeyStatus();
  const oddsProbe = await runOddsProbe({ target: 'today_odds_fetch', sport });
  const eventsProbe = await runEventsProbe({ sport });
  const statsConfigured = Boolean(resolveWithAliases(CANONICAL_KEYS.SPORTSDATA_API_KEY, ALIAS_KEYS[CANONICAL_KEYS.SPORTSDATA_API_KEY]));

  const checks: ProviderHealthCheckSummary = {
    odds: {
      provider: 'odds',
      ok: oddsProbe.ok,
      reason: oddsProbe.ok ? null : oddsProbe.reason,
      statusCode: oddsProbe.status,
      resolvedBaseHost: oddsProbe.resolvedBaseHost,
      runtime: 'nodejs',
      errorName: oddsProbe.errorName,
      errorCode: oddsProbe.errorCode,
      safeMessage: oddsProbe.safeMessage,
    },
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
    liveModeEnv: readString(CANONICAL_KEYS.LIVE_MODE) ?? 'unset',
  };

  const providerErrors: string[] = [];
  const messages: string[] = [];

  if (!oddsProbe.ok && oddsProbe.safeMessage) providerErrors.push(oddsProbe.safeMessage);
  if (oddsProbe.ok && oddsProbe.safeMessage) messages.push(oddsProbe.safeMessage);

  if (!eventsProbe.ok && eventsProbe.safeMessage) {
    providerErrors.push(eventsProbe.safeMessage);
    if (eventsProbe.safeDetail && eventsProbe.safeDetail.length <= 120) providerErrors.push(eventsProbe.safeDetail);
  }
  if (eventsProbe.ok && eventsProbe.safeMessage) messages.push(eventsProbe.safeMessage);

  if (!keyStatus.requiredKeysPresent) providerErrors.push('Required live provider keys are missing');
  if (!keyStatus.liveModeEnabled) providerErrors.push('LIVE_MODE is disabled');
  if (!statsConfigured) providerErrors.push('Sports data provider key is missing');

  const liveEligible = keyStatus.requiredKeysPresent && keyStatus.liveModeEnabled;
  const allHealthy = checks.odds.ok && checks.events.ok && checks.stats === 'configured';
  const ok = liveEligible && allHealthy;
  const mode: 'live' | 'cache' | 'demo' = ok ? 'live' : liveEligible ? 'cache' : 'demo';
  const reason = ok
    ? 'live_ok'
    : (checks.odds.ok && !checks.events.ok ? 'live_degraded_events' : 'provider_unavailable');

  return {
    ok,
    keyStatus,
    checks,
    mode,
    reason,
    providerErrors,
    messages,
  };
}
