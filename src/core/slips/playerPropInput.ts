import { asMarketType, type MarketType } from '../markets/marketType';

export interface PlayerPropInput {
  player: string;
  marketType?: string;
  line?: string;
  odds?: string;
}

export interface PlayerPropSuggestion {
  legText: string;
  marketType: MarketType;
}

export const COMMON_PLAYER_PROP_MARKETS: MarketType[] = ['points', 'threes', 'rebounds', 'ra', 'pra'];

const normalizeOdds = (odds?: string): string | undefined => {
  if (!odds) return undefined;
  const trimmed = odds.trim();
  if (!trimmed) return undefined;
  if (/^[+-]\d{3}$/.test(trimmed)) return trimmed;
  if (/^\d{3}$/.test(trimmed)) return `+${trimmed}`;
  return undefined;
};

export const buildPlayerPropSuggestion = (input: PlayerPropInput): PlayerPropSuggestion => {
  const marketType = asMarketType(input.marketType, 'points');
  const player = input.player.trim();
  const line = input.line?.trim();
  const odds = normalizeOdds(input.odds);

  const legParts = [player, marketType, line, odds].filter(Boolean);
  return {
    legText: legParts.join(' '),
    marketType,
  };
};
