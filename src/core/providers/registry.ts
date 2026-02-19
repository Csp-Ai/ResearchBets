import { createHash } from 'node:crypto';

import type { MarketType } from '../markets/marketType';
import type { PlatformLine } from '../../agents/live/types';

const seeded = (seed: string): number => {
  const hex = createHash('sha1').update(seed).digest('hex').slice(0, 8);
  return Number.parseInt(hex, 16);
};

export interface StatsProvider {
  id: string;
  fetchPlayerStats(input: { player: string; marketType: MarketType; opponent?: string }): Promise<{
    l5: number;
    l10: number;
    seasonAvg: number;
    asOf: string;
    sourceUrl: string;
  }>;
}

export interface LinesProvider {
  id: string;
  fetchLines(input: { player: string; marketType: MarketType }): Promise<PlatformLine[]>;
}

const mockStatsProvider = (id: string): StatsProvider => ({
  id,
  async fetchPlayerStats({ player, marketType, opponent }) {
    const base = seeded(`${id}:${player}:${marketType}:${opponent ?? 'na'}`);
    const seasonAvg = Number((18 + (base % 140) / 10).toFixed(1));
    return {
      l5: Number((seasonAvg + ((base % 11) - 5) / 2).toFixed(1)),
      l10: Number((seasonAvg + ((base % 9) - 4) / 3).toFixed(1)),
      seasonAvg,
      asOf: new Date().toISOString(),
      sourceUrl: `https://data.example.com/${id}/players/${encodeURIComponent(player)}`
    };
  }
});

const lineProvider = (platform: PlatformLine['platform']): LinesProvider => ({
  id: platform.toLowerCase(),
  async fetchLines({ player, marketType }) {
    const base = seeded(`${platform}:${player}:${marketType}`);
    const line = Number((15 + (base % 170) / 10).toFixed(1));
    return [
      {
        platform,
        marketType,
        player,
        line,
        odds: platform === 'Kalshi' ? undefined : -110 + (base % 25),
        payout: platform === 'PrizePicks' ? Number((1.8 + (base % 30) / 100).toFixed(2)) : undefined,
        asOf: new Date().toISOString(),
        sources: [
          {
            provider: platform,
            url: `https://lines.example.com/${platform.toLowerCase()}/${encodeURIComponent(player)}`,
            retrievedAt: new Date().toISOString()
          }
        ]
      }
    ];
  }
});

export interface ProviderRegistry {
  statsProvider: {
    primary: StatsProvider;
    fallback: StatsProvider;
  };
  linesProvider: LinesProvider[];
}

export const providerRegistry: ProviderRegistry = {
  statsProvider: {
    primary: mockStatsProvider('stats-primary'),
    fallback: mockStatsProvider('stats-fallback')
  },
  linesProvider: [lineProvider('FanDuel'), lineProvider('PrizePicks'), lineProvider('Kalshi')]
};
