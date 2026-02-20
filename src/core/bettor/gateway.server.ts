import 'server-only';

import { DEMO_GAMES, type BettorGame } from './demoData';
import { providerRegistry } from '../providers/registry.server';

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

const readProviderStatus = () => ({
  stats: process.env.SPORTSDATAIO_API_KEY ? 'connected' : 'missing',
  odds: process.env.ODDS_API_KEY ? 'connected' : 'missing',
  injuries: process.env.SPORTSDATAIO_API_KEY ? 'connected' : 'missing'
} as const);

const liveModeEnabled = () => process.env.LIVE_MODE === 'true';

const mapEventToGame = (event: { id: string; home_team?: string; away_team?: string; commence_time?: string }): BettorGame => {
  const base = DEMO_GAMES[0] ?? DEMO_GAMES[1]!;
  return {
    ...base,
    id: event.id,
    status: 'upcoming',
    startTime: event.commence_time ? new Date(event.commence_time).toLocaleTimeString() : (base?.startTime ?? "TBD"),
    matchup: `${event.away_team ?? base.awayTeam} @ ${event.home_team ?? base.homeTeam}`,
    homeTeam: event.home_team ?? base.homeTeam,
    awayTeam: event.away_team ?? base.awayTeam,
    propSuggestions: []
  };
};

export const getBettorData = async (): Promise<BettorDataEnvelope> => {
  const providerStatus = readProviderStatus();

  if (!liveModeEnabled()) {
    return {
      mode: 'demo',
      games: DEMO_GAMES,
      providerStatus,
      provenance: { source: 'fallback', reason: 'live_mode_disabled' }
    };
  }

  try {
    const providerEvents = await providerRegistry.oddsProvider.fetchEvents({ sport: 'NBA' });
    if (providerEvents.events.length > 0) {
      return {
        mode: 'live',
        games: providerEvents.events.slice(0, 6).map(mapEventToGame),
        providerStatus,
        provenance: { source: 'provider' }
      };
    }

    return {
      mode: 'demo',
      games: DEMO_GAMES,
      providerStatus,
      provenance: { source: 'fallback', reason: providerEvents.fallbackReason ?? 'provider_no_events' }
    };
  } catch {
    return {
      mode: 'demo',
      games: DEMO_GAMES,
      providerStatus,
      provenance: { source: 'fallback', reason: 'provider_error' }
    };
  }
};
