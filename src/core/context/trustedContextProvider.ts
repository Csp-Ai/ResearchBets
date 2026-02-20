import type { MarketType } from '@/src/core/markets/marketType';
import { getTrustedContextCache, setTrustedContextCache, TRUSTED_CONTEXT_TTL_MS } from './cache';
import type { TrustedContextBundle, TrustedContextItem, TrustedSourceRef } from './types';

type ProviderClock = { now: () => Date };

type TrustedAdapters = {
  injuries?: {
    fetchInjuries?: (input: {
      sport: string;
      teamIds: string[];
      playerIds: string[];
    }) => Promise<{ asOf: string; items: TrustedContextItem[]; sources: TrustedSourceRef[]; fallbackReason?: string }>;
  };
  transactions?: {
    fetchTransactions?: (input: {
      sport: string;
      teamIds: string[];
      playerIds: string[];
    }) => Promise<{ asOf: string; items: TrustedContextItem[]; sources: TrustedSourceRef[]; fallbackReason?: string }>;
  };
  odds?: {
    fetchEventOdds?: (input: {
      sport: string;
      eventIds: string[];
      marketType: MarketType;
    }) => Promise<{ platformLines: Array<{ eventId?: string; line: number; asOf?: string }>; provenance?: { sources?: Array<Partial<TrustedSourceRef> & { provider?: string; url?: string; label?: string; retrievedAt?: string }> }; fallbackReason?: string }>;
  };
};

type ProviderResult = { items: TrustedContextItem[]; fallbackReason?: string };

type FetchInput = {
  sport: 'nba' | 'nfl' | 'soccer';
  teams: Array<{ teamId?: string; team?: string }>;
  players: Array<{ playerId?: string; player?: string; teamId?: string; team?: string }>;
  eventIds?: string[];
};

const defaultClock: ProviderClock = { now: () => new Date() };

const dedupe = (values: Array<string | undefined>): string[] => [...new Set(values.map((v) => v?.trim()).filter((v): v is string => Boolean(v)))];

const sortKey = (input: FetchInput): string => {
  const teams = dedupe(input.teams.flatMap((team) => [team.teamId, team.team])).sort();
  const players = dedupe(input.players.flatMap((player) => [player.playerId, player.player])).sort();
  const events = dedupe(input.eventIds ?? []).sort();
  return `${input.sport}|${teams.join(',')}|${players.join(',')}|${events.join(',')}`;
};

const isGameDay = (eventIds: string[]): boolean => eventIds.length > 0;


const withDefaultTrust = (item: Omit<TrustedContextItem, 'trust'> & { trust?: TrustedContextItem['trust'] }): TrustedContextItem => ({
  ...item,
  trust: item.trust ?? (item.sources.some((source) => source.trust === 'unverified') ? 'unverified' : 'verified')
});

const sanitizeExternalItems = (result: ProviderResult): ProviderResult => {
  const items = result.items.filter((item) => {
    if (!item.headline?.trim() || !item.detail?.trim() || !item.asOf) return false;
    return item.sources.some((source) => Boolean(source.label?.trim()) && Boolean(source.url?.trim()));
  });
  if (items.length > 0 || result.items.length === items.length) return { ...result, items };
  return {
    ...result,
    items,
    fallbackReason: result.fallbackReason ?? 'trusted_item_validation_failed'
  };
};

const joinFallback = (...reasons: Array<string | undefined>): string | undefined => {
  const values = [...new Set(reasons.filter((reason): reason is string => Boolean(reason)))];
  if (values.length === 0) return undefined;
  return values.join('; ');
};


export const createTrustedContextProvider = (adapters: TrustedAdapters = {}, clock: ProviderClock = defaultClock) => {
  const oddsBaseline = new Map<string, { line: number; asOf: string }>();

  return {
    async fetchTrustedContext(input: FetchInput): Promise<TrustedContextBundle> {
      const asOf = clock.now().toISOString();
      const key = sortKey(input);
      const cached = getTrustedContextCache<TrustedContextBundle>(key);
      if (cached) return cached;

      const teamIds = dedupe(input.teams.map((team) => team.teamId));
      const playerIds = dedupe(input.players.map((player) => player.playerId));
      const eventIds = dedupe(input.eventIds ?? []);
      const items: TrustedContextItem[] = [];
      const coverage: TrustedContextBundle['coverage'] = {
        injuries: 'none',
        transactions: 'none',
        odds: 'none',
        schedule: 'none'
      };
      const providerFallbackReasons: string[] = [];

      if (adapters.injuries?.fetchInjuries) {
        const injuryCacheKey = `${key}:injuries`;
        const injuryResult = getTrustedContextCache<Awaited<ReturnType<NonNullable<NonNullable<TrustedAdapters['injuries']>['fetchInjuries']>>>>(injuryCacheKey) ?? setTrustedContextCache(
          injuryCacheKey,
          await adapters.injuries.fetchInjuries({ sport: input.sport, teamIds, playerIds }),
          isGameDay(eventIds) ? TRUSTED_CONTEXT_TTL_MS.injuriesGameDay : TRUSTED_CONTEXT_TTL_MS.injuriesDefault
        );
        const validatedInjury = sanitizeExternalItems(injuryResult);
        if (validatedInjury.fallbackReason) providerFallbackReasons.push(validatedInjury.fallbackReason);
        if (validatedInjury.items.length > 0) {
          coverage.injuries = 'live';
          items.push(...validatedInjury.items.map(withDefaultTrust));
        }
      }

      if (adapters.transactions?.fetchTransactions) {
        const txCacheKey = `${key}:transactions`;
        const txResult = getTrustedContextCache<Awaited<ReturnType<NonNullable<NonNullable<TrustedAdapters['transactions']>['fetchTransactions']>>>>(txCacheKey) ?? setTrustedContextCache(
          txCacheKey,
          await adapters.transactions.fetchTransactions({ sport: input.sport, teamIds, playerIds }),
          TRUSTED_CONTEXT_TTL_MS.transactions
        );
        const validatedTransactions = sanitizeExternalItems(txResult);
        if (validatedTransactions.fallbackReason) providerFallbackReasons.push(validatedTransactions.fallbackReason);
        if (validatedTransactions.items.length > 0) {
          coverage.transactions = 'live';
          items.push(...validatedTransactions.items.map(withDefaultTrust));
        }
      }

      if (adapters.odds?.fetchEventOdds && eventIds.length > 0) {
        const oddsResult = await adapters.odds.fetchEventOdds({ sport: input.sport, eventIds, marketType: 'points' });
        const movementItems: TrustedContextItem[] = [];
        for (const line of oddsResult.platformLines) {
          const eventId = line.eventId;
          if (!eventId || typeof line.line !== 'number') continue;
          const prior = oddsBaseline.get(eventId);
          if (!prior) {
            oddsBaseline.set(eventId, { line: line.line, asOf });
            continue;
          }
          const delta = Number((line.line - prior.line).toFixed(2));
          if (Math.abs(delta) < 0.5) continue;
          movementItems.push({
            kind: 'line_movement',
            subject: { sport: input.sport, eventId },
            headline: `Line moved ${delta > 0 ? '+' : ''}${delta}`,
            detail: `Baseline ${prior.line} → ${line.line}`,
            confidence: 'verified',
            asOf,
            sources: (oddsResult.provenance?.sources ?? []).map((source) => ({ provider: (source.provider as TrustedSourceRef['provider']) ?? 'theoddsapi', label: source.label ?? source.provider ?? 'Odds provider', url: source.url, retrievedAt: source.retrievedAt ?? asOf, trust: source.trust ?? 'verified' }))
          });
        }
        const validatedMovement = sanitizeExternalItems({
          items: movementItems,
          fallbackReason: oddsResult.fallbackReason
        });
        if (validatedMovement.fallbackReason) providerFallbackReasons.push(validatedMovement.fallbackReason);
        if (validatedMovement.items.length > 0) {
          coverage.odds = 'live';
          items.push(...validatedMovement.items.map(withDefaultTrust));
        }
      }

      const scheduleItems = input.teams
        .filter((team) => team.team || team.teamId)
        .slice(0, 3)
        .map<TrustedContextItem>((team) => ({
          kind: 'schedule_spot',
          subject: { sport: input.sport, teamId: team.teamId, team: team.team },
          headline: `${team.team ?? team.teamId ?? 'Team'} schedule spot computed from metadata`,
          confidence: 'verified',
          asOf,
          sources: [{ provider: 'league_official', label: 'Computed from schedule metadata', retrievedAt: asOf, trust: 'verified' }]
        }));
      if (scheduleItems.length > 0) {
        coverage.schedule = 'computed';
        items.push(...scheduleItems.map(withDefaultTrust));
      }

      const bundle: TrustedContextBundle = {
        asOf,
        items,
        coverage,
        fallbackReason: items.length === 0
          ? (joinFallback(...providerFallbackReasons) ?? 'No verified update from trusted sources.')
          : undefined
      };

      return setTrustedContextCache(key, bundle, TRUSTED_CONTEXT_TTL_MS.scheduleSpot);
    }
  };
};

