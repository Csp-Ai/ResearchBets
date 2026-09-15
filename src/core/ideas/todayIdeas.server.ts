import 'server-only';

import { fetchLiveInjuries } from '@/src/core/context/trustedContextProvider.server';
import { ALIAS_KEYS, CANONICAL_KEYS } from '@/src/core/env/keys';
import { resolveWithAliases } from '@/src/core/env/read.server';
import {
  classifyPlayerAvailability,
  normalizePlayerKey,
  type PlayerAvailability,
} from '@/src/core/ideas/playerAvailability';
import { computeMarketImpliedProb } from '@/src/core/markets/edgePrimitives';
import type { MarketType } from '@/src/core/markets/marketType';
import {
  buildEventOddsUrl,
  buildOddsEventsUrl,
  fetchJsonOrThrow,
  resolveOddsApiBaseUrl,
} from '@/src/core/providers/theoddsapi';

export type TodayIdeaEvent = {
  eventId: string;
  matchup: string;
  commenceTime: string;
};

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
  availability?: PlayerAvailability & { source: 'SportsDataIO' };
  stepDown?: {
    line: number;
    bestPrice: number;
    consensusPrice: number;
    marketImpliedProb: number;
    books: string[];
    sourceCount: number;
  };
  stepUp?: {
    line: number;
    bestPrice: number;
    consensusPrice: number;
    marketImpliedProb: number;
    books: string[];
    sourceCount: number;
  };
  why: string[];
};

export type TodayIdeaScanTiming = {
  eventsMs: number;
  eventOddsMs: number;
  injuriesMs: number;
  localProcessingMs: number;
  totalMs: number;
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

const elapsed = (startedAt: number): number => Math.max(0, Date.now() - startedAt);

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

const eventSummary = (event: OddsEvent): TodayIdeaEvent => ({
  eventId: event.id,
  matchup: `${event.away_team} @ ${event.home_team}`,
  commenceTime: event.commence_time,
});

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
  const statusPenalty = idea.availability?.severity === 'caution' ? 12 : 0;
  return probabilityFit + bookSupport - structuralPenalty(idea.structuralRisk) - statusPenalty;
};

const isUsefulParlayThreshold = (idea: TodayIdea): boolean =>
  idea.marketImpliedProb >= MIN_USEFUL_PROBABILITY
  && idea.marketImpliedProb <= MAX_USEFUL_PROBABILITY
  && idea.structuralRisk !== 'high'
  && idea.availability?.severity !== 'blocked';

const statusFromHeadline = (headline: string, player: string): string => {
  const prefix = `${player} - `;
  return headline.startsWith(prefix) ? headline.slice(prefix.length).trim() : headline.trim();
};

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
  events: TodayIdeaEvent[];
  ideas: TodayIdea[];
  warnings: string[];
  diagnostics: { scanTimingMs: TodayIdeaScanTiming };
}> {
  const scanStartedAt = Date.now();
  const sport = input.sport ?? 'NFL';
  const generatedAt = new Date().toISOString();
  const apiKey = resolveWithAliases(
    CANONICAL_KEYS.ODDS_API_KEY,
    ALIAS_KEYS[CANONICAL_KEYS.ODDS_API_KEY],
  );

  if (!apiKey) {
    const totalMs = elapsed(scanStartedAt);
    return {
      mode: 'unavailable',
      generatedAt,
      date: input.date,
      timeZone: input.timeZone,
      sport,
      games: 0,
      events: [],
      ideas: [],
      warnings: ['odds_api_key_missing'],
      diagnostics: {
        scanTimingMs: {
          eventsMs: 0,
          eventOddsMs: 0,
          injuriesMs: 0,
          localProcessingMs: totalMs,
          totalMs,
        },
      },
    };
  }

  const baseUrl = resolveOddsApiBaseUrl();
  const eventsUrl = buildOddsEventsUrl({ baseUrl, sport, apiKey });
  const eventsStartedAt = Date.now();
  const allEvents = await fetchJsonOrThrow<OddsEvent[]>(eventsUrl);
  const eventsMs = elapsed(eventsStartedAt);
  const events = (Array.isArray(allEvents) ? allEvents : [])
    .filter(
      (event) => event.commence_time && formatLocalDate(event.commence_time, input.timeZone) === input.date,
    )
    .sort((a, b) => Date.parse(a.commence_time) - Date.parse(b.commence_time));
  const eventSummaries = events.map(eventSummary);

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

  const eventOddsStartedAt = Date.now();
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
  const eventOddsMs = elapsed(eventOddsStartedAt);

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

  const availabilityByPlayer = new Map<string, TodayIdea['availability']>();
  let injuriesMs = 0;
  if (candidates.length > 0) {
    const injuriesStartedAt = Date.now();
    try {
      const playerNames = [...new Set(candidates.map((candidate) => candidate.player))];
      const injuryResult = await fetchLiveInjuries({
        sport,
        teamIds: [],
        playerIds: playerNames,
      });

      if (injuryResult.fallbackReason && injuryResult.fallbackReason !== 'no_data') {
        warnings.push(`player_status:${injuryResult.fallbackReason}`);
      }

      for (const item of injuryResult.items) {
        const player = item.subject.player;
        if (!player) continue;
        const classified = classifyPlayerAvailability({
          status: statusFromHeadline(item.headline, player),
          detail: item.detail,
          asOf: item.asOf,
        });
        if (!classified) continue;
        availabilityByPlayer.set(normalizePlayerKey(player), {
          ...classified,
          source: 'SportsDataIO',
        });
      }
    } catch {
      warnings.push('player_status:provider_unavailable');
    } finally {
      injuriesMs = elapsed(injuriesStartedAt);
    }
  }

  const statusAwareCandidates = candidates.map((candidate) => {
    const availability = availabilityByPlayer.get(normalizePlayerKey(candidate.player));
    if (!availability) return candidate;
    return {
      ...candidate,
      availability,
      why: [
        ...candidate.why,
        `Player status: ${availability.label}${availability.detail ? ` — ${availability.detail}` : ''}`,
      ],
    };
  });

  const blockedCount = statusAwareCandidates.filter((candidate) => candidate.availability?.severity === 'blocked').length;
  if (blockedCount > 0) warnings.push(`player_status_blocked:${blockedCount}`);

  const useful = statusAwareCandidates.filter(isUsefulParlayThreshold);
  if (useful.length === 0 && statusAwareCandidates.length > 0) {
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

    const sameMarketCandidates = statusAwareCandidates.filter((candidate) =>
      candidate.eventId === idea.eventId
      && candidate.player.toLowerCase() === playerKey
      && candidate.marketType === idea.marketType
      && candidate.availability?.severity !== 'blocked',
    );

    const stepDownCandidate = sameMarketCandidates
      .filter((candidate) => candidate.line < idea.line)
      .sort((a, b) => b.line - a.line || b.sourceCount - a.sourceCount)[0];

    const stepUpCandidate = sameMarketCandidates
      .filter((candidate) => candidate.line > idea.line)
      .sort((a, b) => a.line - b.line || b.sourceCount - a.sourceCount)[0];

    const stepDown = stepDownCandidate
      ? {
          line: stepDownCandidate.line,
          bestPrice: stepDownCandidate.bestPrice,
          consensusPrice: stepDownCandidate.consensusPrice,
          marketImpliedProb: stepDownCandidate.marketImpliedProb,
          books: stepDownCandidate.books,
          sourceCount: stepDownCandidate.sourceCount,
        }
      : undefined;

    const stepUp = stepUpCandidate
      ? {
          line: stepUpCandidate.line,
          bestPrice: stepUpCandidate.bestPrice,
          consensusPrice: stepUpCandidate.consensusPrice,
          marketImpliedProb: stepUpCandidate.marketImpliedProb,
          books: stepUpCandidate.books,
          sourceCount: stepUpCandidate.sourceCount,
        }
      : undefined;

    const probabilityGain = stepDown
      ? Math.max(0, stepDown.marketImpliedProb - idea.marketImpliedProb)
      : 0;
    const probabilityCost = stepUp
      ? Math.max(0, idea.marketImpliedProb - stepUp.marketImpliedProb)
      : 0;

    selected.push({
      ...idea,
      stepDown,
      stepUp,
      why: [
        `${Math.round(idea.marketImpliedProb * 100)}% sportsbook-price implied at the median posted price`,
        `${idea.sourceCount} book${idea.sourceCount === 1 ? '' : 's'} posting this exact threshold`,
        'Selected inside the useful parlay band instead of the shortest available alt line',
        ...(idea.availability?.severity === 'caution'
          ? [`Status caution from ${idea.availability.source}: ${idea.availability.label}`]
          : []),
        ...(stepDown
          ? [`Next lower posted tier: ${stepDown.line} (${Math.round(stepDown.marketImpliedProb * 100)}% market-implied, +${Math.round(probabilityGain * 100)} pts vs selected)`]
          : []),
        ...(stepUp
          ? [`Next higher posted tier: ${stepUp.line} (${Math.round(stepUp.marketImpliedProb * 100)}% market-implied, -${Math.round(probabilityCost * 100)} pts vs selected)`]
          : []),
      ],
    });
    usedPlayers.add(playerKey);
    gameCounts.set(idea.eventId, gameCount + 1);
    if (selected.length >= limit) break;
  }

  const totalMs = elapsed(scanStartedAt);
  const localProcessingMs = Math.max(0, totalMs - eventsMs - eventOddsMs - injuriesMs);

  return {
    mode: 'live-market',
    generatedAt,
    date: input.date,
    timeZone: input.timeZone,
    sport,
    games: events.length,
    events: eventSummaries,
    ideas: selected,
    warnings,
    diagnostics: {
      scanTimingMs: {
        eventsMs,
        eventOddsMs,
        injuriesMs,
        localProcessingMs,
        totalMs,
      },
    },
  };
}
