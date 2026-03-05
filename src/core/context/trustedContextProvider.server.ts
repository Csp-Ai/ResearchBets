import 'server-only';

import { fetchJsonWithCache } from '@/src/core/sources/fetchJsonWithCache';
import { ALIAS_KEYS, CANONICAL_KEYS } from '@/src/core/env/keys';
import { resolveWithAliases } from '@/src/core/env/read.server';
import { getProviderRegistry } from '@/src/core/providers/registry.server';

import { createTrustedContextProvider } from './trustedContextProvider';
import type { TrustedContextBundle, TrustedContextItem } from './types';

type FetchInput = {
  sport: 'nba' | 'nfl' | 'soccer';
  teams: Array<{ teamId?: string; team?: string }>;
  players: Array<{ playerId?: string; player?: string; teamId?: string; team?: string }>;
  eventIds?: string[];
};

type InjuryRow = Record<string, unknown>;

const normalizeSport = (sport: string): 'nba' | 'nfl' | 'soccer' => {
  const key = sport.toLowerCase();
  if (key === 'nfl') return 'nfl';
  if (key === 'soccer') return 'soccer';
  return 'nba';
};

const resolveSportsDataKey = () => process.env.TRUSTED_SPORTSDATAIO_KEY ?? resolveWithAliases(CANONICAL_KEYS.SPORTSDATA_API_KEY, ALIAS_KEYS[CANONICAL_KEYS.SPORTSDATA_API_KEY]);

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
};

const toTrustedItem = (row: InjuryRow, sport: FetchInput['sport']): TrustedContextItem | null => {
  const player = asString(row.Name ?? row.PlayerName ?? row.player);
  const team = asString(row.Team ?? row.team);
  const status = asString(row.InjuryStatus ?? row.Status ?? row.status) ?? 'Status unavailable';
  const note = asString(row.InjuryNotes ?? row.News ?? row.note) ?? '';
  const updated = asString(row.Updated ?? row.UpdatedAt ?? row.LastUpdated) ?? new Date().toISOString();
  if (!player || !team) return null;

  return {
    kind: 'injury',
    subject: { sport, team, player },
    headline: `${player} - ${status}`,
    detail: note || `${team} status update`,
    confidence: 'verified',
    asOf: updated,
    sources: [{
      provider: 'sportsdataio',
      label: 'SportsDataIO',
      url: 'https://sportsdata.io',
      retrievedAt: new Date().toISOString(),
      trust: 'verified'
    }]
  };
};

async function fetchLiveInjuries(input: { sport: string; teamIds: string[]; playerIds: string[] }) {
  const apiKey = resolveSportsDataKey();
  if (!apiKey) {
    return {
      asOf: new Date().toISOString(),
      items: [],
      sources: [],
      fallbackReason: 'provider key missing: SPORTSDataIO'
    };
  }

  try {
    const sport = normalizeSport(input.sport);
    const url = `https://api.sportsdata.io/v3/${sport}/scores/json/Injuries`;
    const response = await fetchJsonWithCache<InjuryRow[]>(url, {
      source: 'sportsdataio',
      ttlMs: 5 * 60 * 1000,
      headers: { 'Ocp-Apim-Subscription-Key': apiKey }
    });

    const filterTeams = new Set(input.teamIds);
    const filterPlayers = new Set(input.playerIds);
    const rows = Array.isArray(response.data) ? response.data : [];
    const items = rows
      .map((row) => toTrustedItem(row, normalizeSport(input.sport)))
      .filter((item): item is TrustedContextItem => Boolean(item))
      .filter((item) => {
        if (filterTeams.size === 0 && filterPlayers.size === 0) return true;
        return (item.subject.team && filterTeams.has(item.subject.team)) || (item.subject.player && filterPlayers.has(item.subject.player));
      })
      .slice(0, 10);

    return {
      asOf: response.retrievedAt,
      items,
      sources: [{ provider: 'sportsdataio', label: 'SportsDataIO', url: response.url, retrievedAt: response.retrievedAt, trust: 'verified' as const }],
      fallbackReason: items.length ? undefined : 'no_data'
    };
  } catch {
    return {
      asOf: new Date().toISOString(),
      items: [],
      sources: [],
      fallbackReason: 'provider_unavailable'
    };
  }
}

export const trustedContextProvider = createTrustedContextProvider({
  injuries: {
    fetchInjuries: fetchLiveInjuries
  },
  odds: {
    fetchEventOdds: async (input) => {
      if (!resolveWithAliases(CANONICAL_KEYS.ODDS_API_KEY, ALIAS_KEYS[CANONICAL_KEYS.ODDS_API_KEY]) && !process.env.TRUSTED_ODDS_API_KEY) {
        return {
          platformLines: [],
          provenance: { sources: [] },
          fallbackReason: 'provider key missing: Odds API'
        };
      }
      return getProviderRegistry().oddsProvider.fetchEventOdds(input);
    }
  }
});

export async function fetchTrustedContext(input: FetchInput): Promise<TrustedContextBundle> {
  return trustedContextProvider.fetchTrustedContext(input);
}

export { fetchLiveInjuries };
