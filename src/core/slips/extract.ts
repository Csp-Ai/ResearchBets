import { asMarketType } from '../markets/marketType';

// Refer to MarketType for all prop logic. Do not hardcode string markets.
export type ExtractedLeg = {
  selection: string;
  market?: string;
  odds?: string;
};

const LINE_PATTERN = /^(?<selection>[A-Za-z0-9 .@+-]+?)(?:\s+(?<market>spread|total|moneyline|points|threes|rebounds|assists|ra|pra))?(?:\s+(?<odds>[+-]\d{3}))?$/i;

export const extractLegs = (rawText: string): ExtractedLeg[] => {
  try {
    const parsed = JSON.parse(rawText) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => typeof item === 'object' && item !== null)
        .map((item) => ({
          selection: String((item as Record<string, unknown>).selection ?? 'Unknown'),
          market: (item as Record<string, unknown>).market
            ? asMarketType(String((item as Record<string, unknown>).market), 'points')
            : undefined,
          odds: (item as Record<string, unknown>).odds ? String((item as Record<string, unknown>).odds) : undefined,
        }));
    }
  } catch {
    // noop; falls through to line parser
  }

  return rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(LINE_PATTERN);
      if (!match?.groups) {
        return { selection: line };
      }
      const selection = match.groups.selection?.trim() || line;
      return {
        selection,
        market: match.groups.market ? asMarketType(match.groups.market, 'points') : undefined,
        odds: match.groups.odds,
      };
    });
};
