import 'server-only';

import { fetchLiveInjuries } from '@/src/core/context/trustedContextProvider.server';
import { normalizePlayerKey } from '@/src/core/ideas/playerAvailability';
import type { MarketType } from '@/src/core/markets/marketType';
import { getProviderRegistry } from '@/src/core/providers/registry.server';
import { fetchNbaResearchHistory, type ResearchGameHistory } from '@/src/core/providers/sportsdataio';
import type { TicketEvidence, TicketEvidenceRequest, TicketEvidenceResponse } from './ticketEvidence';

type Leg = TicketEvidenceRequest['legs'][number];
type League = 'NBA' | 'NFL';

const NBA_MARKETS = new Set<MarketType>(['points', 'rebounds', 'assists', 'threes', 'ra', 'pra']);
const PLAYER_MARKETS = new Set<MarketType>([
  ...NBA_MARKETS, 'passing_yards', 'passing_tds', 'rushing_yards', 'rushing_receiving_yards',
  'receiving_yards', 'receptions', 'carries', 'anytime_td'
]);
const maxHistoryPlayers = 8;

type ProviderEvent = { id: string; home_team?: string; away_team?: string; commence_time?: string };

const eventFor = (events: ProviderEvent[], matchup?: string): ProviderEvent | undefined => {
  const names = matchup?.split(/\s+(?:@|at|vs\.?)\s+/i).map(normalizePlayerKey);
  if (names?.length !== 2 || names.some((name) => !name)) return undefined;
  const matches = events.filter((event) => {
    const teams = [event.home_team, event.away_team].map((name) => normalizePlayerKey(name ?? ''));
    return names.every((name) => teams.includes(name));
  });
  return matches.length === 1 ? matches[0] : undefined;
};

const historyFor = (history: ResearchGameHistory | undefined, leg: Leg): TicketEvidence['history'] => {
  if (!history) return undefined;
  const games = history.logs.flatMap((log) => {
    const points = log.stats.points;
    const rebounds = log.stats.rebounds;
    const assists = log.stats.assists;
    const value = leg.market === 'pra' && points != null && rebounds != null && assists != null
      ? points + rebounds + assists
      : leg.market === 'ra' && rebounds != null && assists != null
        ? rebounds + assists
        : leg.market === 'points' || leg.market === 'rebounds' || leg.market === 'assists' || leg.market === 'threes'
          ? log.stats[leg.market]
          : undefined;
    return value == null || !Number.isFinite(value) ? [] : [{ date: log.gameDate, value }];
  });
  return games.length ? {
    games,
    source: 'SportsDataIO',
    retrievedAt: history.retrievedAt,
    freshness: history.cacheHit ? 'cached historical' : 'historical'
  } : undefined;
};

async function evidenceForLeague(league: League, legs: Leg[]) {
  const players = [...new Set(legs.filter((leg) => PLAYER_MARKETS.has(leg.market)).map((leg) => leg.player))];
  const historyPlayers = league === 'NBA'
    ? [...new Set(legs.filter((leg) => NBA_MARKETS.has(leg.market)).map((leg) => leg.player))].slice(0, maxHistoryPlayers)
    : [];
  const { oddsProvider } = getProviderRegistry();
  const [eventResult, injuries, history] = await Promise.all([
    oddsProvider.id === 'the-odds-api' && legs.some((leg) => leg.matchup)
      ? oddsProvider.fetchEvents({ sport: league }).catch(() => null)
      : null,
    players.length ? fetchLiveInjuries({ sport: league, teamIds: [], playerIds: players, requireUpdateTime: true }) : null,
    historyPlayers.length ? fetchNbaResearchHistory(historyPlayers).catch(() => new Map<string, ResearchGameHistory>()) : null
  ]);

  return legs.map((leg): [string, TicketEvidence] => {
    const event = eventFor(eventResult?.events ?? [], leg.matchup);
    const retrievedAt = eventResult?.provenance.sources.find((source) => source.provider === 'the-odds-api')?.retrievedAt;
    const injury = PLAYER_MARKETS.has(leg.market)
      ? injuries?.items.find((item) => normalizePlayerKey(item.subject.player ?? '') === normalizePlayerKey(leg.player))
      : undefined;
    const updated = Date.parse(injury?.asOf ?? '');
    return [leg.id, {
      event: event?.home_team && event.away_team && event.commence_time &&
        Number.isFinite(Date.parse(event.commence_time)) && retrievedAt ? {
        matchup: `${event.away_team} at ${event.home_team}`,
        eventDate: event.commence_time,
        source: 'The Odds API',
        retrievedAt,
        freshness: 'live'
      } : undefined,
      injuries: injury && injuries && Number.isFinite(updated) ? {
        report: injury.headline,
        source: 'SportsDataIO',
        retrievedAt: injuries.asOf,
        updatedAt: injury.asOf,
        freshness: Date.now() - updated > 86_400_000 ? 'stale' : 'recent'
      } : undefined,
      history: historyFor(history?.get(normalizePlayerKey(leg.player)), leg)
    }];
  });
}

export async function fetchTicketEvidence({ legs }: TicketEvidenceRequest): Promise<TicketEvidenceResponse> {
  const groups = await Promise.all((['NBA', 'NFL'] as const).map((league) => {
    const matching = legs.filter((leg) => leg.league === league);
    return matching.length ? evidenceForLeague(league, matching) : [];
  }));
  return { byLegId: Object.fromEntries(groups.flat()) };
}
