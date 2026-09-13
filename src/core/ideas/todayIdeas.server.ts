import 'server-only';

import { ALIAS_KEYS, CANONICAL_KEYS } from '@/src/core/env/keys';
import { resolveWithAliases } from '@/src/core/env/read.server';
import { computeMarketImpliedProb } from '@/src/core/markets/edgePrimitives';
import type { MarketType } from '@/src/core/markets/marketType';
import {
  buildEventOddsUrl,
  buildOddsEventsUrl,
  fetchJsonOrThrow,
  resolveOddsApiBaseUrl,
} from '@/src/core/providers/theoddsapi';

export type TodayIdea = {
  id: string;
  sport: 'NFL';
  eventId: string;
  matchup: string;
  commenceTime: string;
  player: string;
  marketType: MarketType;
  line: number;
  bestPrice: number;
  consensusPrice: number;
  marketImpliedProb: number;
  books: string[];
  sourceCount: number;
  structuralRisk: 'low' | 'medium' | 'high';
  readiness: 'market-verified' | 'needs-status-check';
  why: string[];
};

type OddsEvent = {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
};

type EventOdds = OddsEvent & {
  bookmakers?: Array<{
    key: string;
    title?: string;
    markets?: Array<{
      key: string;
      outcomes?: Array<{
        name: string;
        description?: string;
        point?: number;
        price?: number;
      }>;
    }>;
  }>;
};

type MarketConfig = {
  apiKey: string;
  marketType: MarketType;
  structuralRisk: TodayIdea['structuralRisk'];
};

const NFL_MARKETS: MarketConfig[] = [
  { apiKey: 'player_pass_yds_alternate', marketType: 'passing_yards', structuralRisk: 'low' },
  { apiKey: 'player_reception_yds_alternate', marketType: 'receiving_yards', structuralRisk: 'medium' },
  { apiKey: 'player_receptions_alternate', marketType: 'receptions', structuralRisk: 'low' },
  { apiKey: 'player_rush_yds_alternate', marketType: 'rushing_yards', structuralRisk: 'medium' },
  { apiKey: 'player_rush_attempts_alternate', marketType: 'carries', structuralRisk: 'medium' },
  { apiKey: 'player_pass_tds_alternate', marketType: 'passing_tds', structuralRisk: 'high' },
  { apiKey: 'player_anytime_td', marketType: 'anytime_td', structuralRisk: 'high' },
];

const MIN_USEFUL_PROBABILITY = 0.58;
const MAX_USEFUL_PROBABILITY = 0.86;
const TARGET_PROBABILITY: Record<TodayIdea['structuralRisk'], number> = {
  low: 0.78,
  medium: 0.72,
  high: 0.62,
};

const formatLocalDate = (iso: string, timeZone: string): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return -110;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round(((sorted[mid - 1] ?? -110) + (sorted[mid] ?? -110)) / 2)
    : (sorted[mid] ?? -110);
};

const parsePlayer = (outcome: { name: string; description?: string }): string | null => {
  const name = outcome.name.trim();
  const description = outcome.description?.trim();
  if (/^(over|under|yes|no)$/i.test(name)) return description || null;
  return description || name || null;
};

const isPositiveOutcome = (name: string): boolean => !/^(under|no)$/i.test(name.trim());

const structuralPenalty = (risk: TodayIdea['structuralRisk']) => {
  if (risk === 'high') return 14;
  if (risk === 'medium') return 4;
  return 0;
};

const utilityScore = (idea: TodayIdea): number => {
  const target = TARGET_PROBABILITY[idea.structuralRisk];
  const probabilityFit = 100 - Math.abs(idea.marketImpliedProb - target) * 180;
  const bookSupport = Math.min(idea.sourceCount, 5) * 2;
  return probabilityFit + bookSupport - structuralPenalty(idea.structuralRisk);
};

const isUsefulParlayThreshold = (idea: TodayIdea): boolean =>
  idea.marketImpliedProb >= MIN_USEFUL_PROBABILITY
  && idea.marketImpliedProb <= MAX_USEFUL_PROBABILITY
  && idea.structuralRisk !== 'high';

export async function scanTodayIdeas(input: {
  date: string;
  timeZone: string;
  sport?: 'NFL';
  limit?: number;
}): Promise<{
  mode: 'live-market' | 'unavailable';
  generatedAt: string;
  date: string;
  timeZone: string;
  sport: 'NFL';
  games: number;
  ideas: TodayIdea[];
  warnings: string[];
}> {
  const sport = input.sport ?? 'NFL';
  const generatedAt = new Date().toISOString();
  const apiKey = resolveWithAliases(
    CANONICAL_KEYS.ODDS_API_KEY,
    ALIAS_KEYS[CANONICAL_KEYS.ODDS_API_KEY],
  );

  if (!apiKey) {
    return {
      mode: 'unavailable',
      generatedAt,
      date: input.date,
      timeZone: input.timeZone,
      sport,
      games: 0,
      ideas: [],
      warnings: ['odds_api_key_missing'],
    };
  }

  const baseUrl = resolveOddsApiBaseUrl();
  const eventsUrl = buildOddsEventsUrl({ baseUrl, sport, apiKey });
  const allEvents = await fetchJsonOrThrow<OddsEvent[]>(eventsUrl);
  const events = (Array.isArray(allEvents) ? allEvents : []).filter(
    (event) => event.commence_time && formatLocalDate(event.commence_time, input.timeZone) === input.date,
  );

  const marketQuery = NFL_MARKETS.map((market) => market.apiKey).join(',');
  const rows: Array<{
    event: OddsEvent;
    player: string;
    marketType: MarketType;
    line: number;
    price: number;
    book: string;
    structuralRisk: TodayIdea['structuralRisk'];
  }> = [];
  const warnings: string[] = [];

  for (const event of events) {
    try {
      const url = buildEventOddsUrl({
        baseUrl,
        sport,
        eventId: event.id,
        apiKey,
        market: marketQuery,
      });
      const eventOdds = await fetchJsonOrThrow<EventOdds>(url);

      for (const book of eventOdds.bookmakers ?? []) {
        for (const market of book.markets ?? []) {
          const config = NFL_MARKETS.find((entry) => entry.apiKey === market.key);
          if (!config) continue;

          for (const outcome of market.outcomes ?? []) {
            if (!isPositiveOutcome(outcome.name)) continue;
            const player = parsePlayer(outcome);
            const price = outcome.price;
            const line = config.marketType === 'anytime_td' ? 1 : outcome.point;
            if (!player || typeof price !== 'number' || typeof line !== 'number') continue;

            rows.push({
              event,
              player,
              marketType: config.marketType,
              line,
              price,
              book: book.key,
              structuralRisk: config.structuralRisk,
            });
          }
        }
      }
    } catch {
      warnings.push(`event_odds_unavailable:${event.id}`);
    }
  }

  const grouped = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = [row.event.id, row.player.toLowerCase(), row.marketType, row.line].join('|');
    const existing = grouped.get(key) ?? [];
    existing.push(row);
    grouped.set(key, existing);
  }

  const candidates: TodayIdea[] = [];
  for (const [id, group] of grouped.entries()) {
    const first = group[0];
    if (!first) continue;
    const prices = group.map((row) => row.price);
    const consensusPrice = median(prices);
    const bestPrice = Math.max(...prices);
    const books = [...new Set(group.map((row) => row.book))];
    const matchup = `${first.event.away_team} @ ${first.event.home_team}`;
    const marketImpliedProb = computeMarketImpliedProb({ odds: String(consensusPrice) });

    candidates.push({
      id,
      sport,
      eventId: first.event.id,
      matchup,
      commenceTime: first.event.commence_time,
      player: first.player,
      marketType: first.marketType,
      line: first.line,
      bestPrice,
      consensusPrice,
      marketImpliedProb,
      books,
      sourceCount: books.length,
      structuralRisk: first.structuralRisk,
      readiness: 'needs-status-check',
      why: [
        `${Math.round(marketImpliedProb * 100)}% market-implied probability at the median available price`,
        `${books.length} book${books.length === 1 ? '' : 's'} currently posting this threshold`,
      ],
    });
  }

  const useful = candidates.filter(isUsefulParlayThreshold);
  if (useful.length === 0 && candidates.length > 0) {
    warnings.push('no_candidates_in_useful_parlay_price_band');
  }

  // Alternate markets often expose many thresholds for the same player/market.
  // Keep the threshold closest to a useful parlay probability band rather than
  // blindly selecting the shortest -10000 style line.
  const bestPerPlayerMarket = new Map<string, TodayIdea>();
  for (const idea of useful) {
    const key = `${idea.eventId}|${idea.player.toLowerCase()}|${idea.marketType}`;
    const current = bestPerPlayerMarket.get(key);
    if (!current || utilityScore(idea) > utilityScore(current)) {
      bestPerPlayerMarket.set(key, idea);
    }
  }

  const sorted = [...bestPerPlayerMarket.values()].sort(
    (a, b) => utilityScore(b) - utilityScore(a),
  );
  const selected: TodayIdea[] = [];
  const usedPlayers = new Set<string>();
  const gameCounts = new Map<string, number>();
  const limit = Math.max(1, Math.min(input.limit ?? 10, 16));

  for (const idea of sorted) {
    const playerKey = idea.player.toLowerCase();
    const gameCount = gameCounts.get(idea.eventId) ?? 0;
    if (usedPlayers.has(playerKey) || gameCount >= 2) continue;

    selected.push({
      ...idea,
      why: [
        `${Math.round(idea.marketImpliedProb * 100)}% sportsbook-price implied at the median posted price`,
        `${idea.sourceCount} book${idea.sourceCount === 1 ? '' : 's'} posting this exact threshold`,
        'Selected inside the useful parlay band instead of the shortest available alt line',
      ],
    });
    usedPlayers.add(playerKey);
    gameCounts.set(idea.eventId, gameCount + 1);
    if (selected.length >= limit) break;
  }

  return {
    mode: 'live-market',
    generatedAt,
    date: input.date,
    timeZone: input.timeZone,
    sport,
    games: events.length,
    ideas: selected,
    warnings,
  };
}
