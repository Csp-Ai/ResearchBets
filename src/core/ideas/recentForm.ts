import type { MarketType } from '@/src/core/markets/marketType';

export type NflRecentStatLine = {
  gameDate: string;
  passingYards?: number;
  passingTouchdowns?: number;
  rushingYards?: number;
  receivingYards?: number;
  receptions?: number;
  carries?: number;
  anytimeTouchdowns?: number;
};

export type RecentThresholdForm = {
  l5HitRate: number;
  l10HitRate: number;
  l5Hits: number;
  l5Games: number;
  l10Hits: number;
  l10Games: number;
  recentAverage: number;
  sampleSize: number;
  season: string;
  asOf: string;
  source: 'SportsDataIO';
};

export const nflMarketValue = (
  line: NflRecentStatLine,
  marketType: MarketType,
): number | null => {
  switch (marketType) {
    case 'passing_yards': return line.passingYards ?? null;
    case 'passing_tds': return line.passingTouchdowns ?? null;
    case 'rushing_yards': return line.rushingYards ?? null;
    case 'receiving_yards': return line.receivingYards ?? null;
    case 'receptions': return line.receptions ?? null;
    case 'carries': return line.carries ?? null;
    case 'anytime_td': return line.anytimeTouchdowns ?? null;
    default: return null;
  }
};

const hitRate = (values: number[], threshold: number) => {
  if (!values.length) return { rate: 0, hits: 0, games: 0 };
  const hits = values.filter((value) => value >= threshold).length;
  return {
    rate: Number((hits / values.length).toFixed(4)),
    hits,
    games: values.length,
  };
};

export function computeRecentThresholdForm(input: {
  logs: NflRecentStatLine[];
  marketType: MarketType;
  threshold: number;
  season: string;
  asOf: string;
}): RecentThresholdForm | null {
  const values = [...input.logs]
    .sort((a, b) => Date.parse(b.gameDate) - Date.parse(a.gameDate))
    .map((log) => nflMarketValue(log, input.marketType))
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    .slice(0, 10);

  if (!values.length) return null;

  const l5Values = values.slice(0, 5);
  const l5 = hitRate(l5Values, input.threshold);
  const l10 = hitRate(values, input.threshold);
  const recentAverage = Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));

  return {
    l5HitRate: l5.rate,
    l10HitRate: l10.rate,
    l5Hits: l5.hits,
    l5Games: l5.games,
    l10Hits: l10.hits,
    l10Games: l10.games,
    recentAverage,
    sampleSize: values.length,
    season: input.season,
    asOf: input.asOf,
    source: 'SportsDataIO',
  };
}
