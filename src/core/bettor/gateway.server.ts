import 'server-only';

import { randomUUID } from 'node:crypto';

import { DEMO_GAMES, type BettorGame } from './demoData';
import { getServerEnv } from '../env/server';
import { providerRegistry } from '../providers/registry.server';
import { getSupabaseServiceClient } from '@/src/services/supabase';

export type BettorDataEnvelope = {
  mode: 'live' | 'demo';
  games: BettorGame[];
  providerStatus: {
    stats: 'connected' | 'missing';
    odds: 'connected' | 'missing';
    injuries: 'connected' | 'missing';
  };
  provenance: {
    source: 'provider' | 'fallback';
    reason?: string;
  };
};

const providerCircuit = {
  openUntilMs: 0,
  consecutiveFailures: 0
};

const readProviderStatus = () => {
  const env = getServerEnv();
  return {
    stats: env.sportsDataApiKey ? 'connected' : 'missing',
    odds: env.oddsApiKey ? 'connected' : 'missing',
    injuries: env.sportsDataApiKey ? 'connected' : 'missing'
  } as const;
};

const liveModeEnabled = (override?: boolean) => {
  if (typeof override === 'boolean') return override;
  return getServerEnv().liveMode;
};

const mapEventToGame = (event: { id: string; home_team?: string; away_team?: string; commence_time?: string }): BettorGame => {
  const base = DEMO_GAMES[0] ?? DEMO_GAMES[1]!;
  return {
    ...base,
    id: event.id,
    status: 'upcoming',
    startTime: event.commence_time ? new Date(event.commence_time).toLocaleTimeString() : (base?.startTime ?? 'TBD'),
    matchup: `${event.away_team ?? base.awayTeam} @ ${event.home_team ?? base.homeTeam}`,
    homeTeam: event.home_team ?? base.homeTeam,
    awayTeam: event.away_team ?? base.awayTeam,
    propSuggestions: []
  };
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('provider_timeout')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
};

const emitGatewayEvent = async (eventName: string, properties: Record<string, unknown>) => {
  try {
    const supabase = getSupabaseServiceClient();
    await supabase.from('events_analytics').insert({
      event_name: eventName,
      request_id: randomUUID(),
      trace_id: randomUUID(),
      run_id: randomUUID(),
      session_id: 'system:bettor_gateway',
      user_id: 'system',
      agent_id: 'bettor_gateway',
      model_version: 'gateway-v2',
      properties,
      created_at: new Date().toISOString()
    });
  } catch {
    // best-effort analytics only
  }
};

const fallback = async (reason: string, providerStatus: BettorDataEnvelope['providerStatus']): Promise<BettorDataEnvelope> => {
  await emitGatewayEvent('bettor_gateway_fallback', {
    reason,
    hasOddsKey: providerStatus.odds === 'connected',
    hasStatsKey: providerStatus.stats === 'connected'
  });

  return {
    mode: 'demo',
    games: DEMO_GAMES,
    providerStatus,
    provenance: { source: 'fallback', reason }
  };
};

export const getBettorData = async (options?: { liveModeOverride?: boolean }): Promise<BettorDataEnvelope> => {
  const providerStatus = readProviderStatus();
  const env = getServerEnv();

  if (!liveModeEnabled(options?.liveModeOverride)) {
    return fallback('live_mode_disabled', providerStatus);
  }

  const missingLiveKeys: string[] = [];
  if (!env.oddsApiKey) missingLiveKeys.push('ODDS_API_KEY');

  if (missingLiveKeys.length > 0) {
    return fallback('fallback_due_to_missing_keys', providerStatus);
  }

  if (providerCircuit.openUntilMs > Date.now()) {
    return fallback('provider_circuit_open', providerStatus);
  }

  try {
    const providerEvents = await withTimeout(providerRegistry.oddsProvider.fetchEvents({ sport: 'NBA' }), 6_000);
    providerCircuit.consecutiveFailures = 0;

    if (providerEvents.events.length > 0) {
      return {
        mode: 'live',
        games: providerEvents.events.slice(0, 6).map(mapEventToGame),
        providerStatus,
        provenance: { source: 'provider' }
      };
    }

    return fallback(providerEvents.fallbackReason ?? 'provider_no_events', providerStatus);
  } catch {
    providerCircuit.consecutiveFailures += 1;
    if (providerCircuit.consecutiveFailures >= 2) {
      providerCircuit.openUntilMs = Date.now() + 60_000;
    }
    return fallback('provider_error', providerStatus);
  }
};
