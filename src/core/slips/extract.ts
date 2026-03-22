import { asMarketType } from '../markets/marketType';

// Refer to MarketType for all prop logic. Do not hardcode string markets.
export type ExtractedLeg = {
  selection: string;
  market?: string;
  line?: string;
  odds?: string;
  team?: string;
  player?: string;
  sport?: string;
  eventTime?: string;
  book?: string;
  matchup?: string;
  game_id?: string;
  event_id?: string;
  home?: string;
  away?: string;
};

const LINE_PATTERN =
  /^(?<selection>[A-Za-z0-9 .@+-]+?)(?:\s+(?<market>spread|total|moneyline|points|threes|rebounds|assists|ra|pra))?(?:\s+(?<odds>[+-]\d{3}))?$/i;

export const extractLegs = (rawText: string): ExtractedLeg[] => {
  try {
    const parsed = JSON.parse(rawText) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => typeof item === 'object' && item !== null)
        .map((item) => {
          const record = item as Record<string, unknown>;
          return {
            selection: String(record.selection ?? 'Unknown'),
            market: record.market ? asMarketType(String(record.market), 'points') : undefined,
            line: record.line ? String(record.line) : undefined,
            odds: record.odds ? String(record.odds) : undefined,
            team: record.team ? String(record.team) : undefined,
            player: record.player ? String(record.player) : undefined,
            sport: record.sport ? String(record.sport) : undefined,
            eventTime: record.eventTime ? String(record.eventTime) : undefined,
            book: record.book ? String(record.book) : undefined,
            matchup: record.matchup ? String(record.matchup) : undefined,
            game_id: record.game_id ? String(record.game_id) : undefined,
            event_id: record.event_id ? String(record.event_id) : undefined,
            home: record.home ? String(record.home) : undefined,
            away: record.away ? String(record.away) : undefined
          };
        });
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
        odds: match.groups.odds
      };
    });
};
