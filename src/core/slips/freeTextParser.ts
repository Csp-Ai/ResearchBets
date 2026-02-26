export type ParsedSlipLeg = {
  sport: string | null;
  league: string | null;
  eventDate: string | null;
  teamOrPlayer: string;
  marketType: string | null;
  line: number | null;
  odds: number | null;
  book: string | null;
  confidence: number;
};

const SPORT_KEYWORDS: Record<string, { sport: string; league: string }> = {
  nba: { sport: 'Basketball', league: 'NBA' },
  nfl: { sport: 'Football', league: 'NFL' },
  mlb: { sport: 'Baseball', league: 'MLB' },
  nhl: { sport: 'Hockey', league: 'NHL' },
  ufc: { sport: 'MMA', league: 'UFC' },
  soccer: { sport: 'Soccer', league: 'Soccer' },
};

const BOOK_KEYWORDS = ['fanduel', 'draftkings', 'betmgm', 'caesars', 'espnbet', 'prizepicks', 'kalshi'];
const MARKET_KEYWORDS = ['points', 'rebounds', 'assists', 'threes', 'pra', 'moneyline', 'spread', 'total', 'shots', 'goals'];

const toLine = (line: string | undefined): number | null => {
  if (!line) return null;
  const parsed = Number(line);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseSlipText = (rawText: string): { legs: ParsedSlipLeg[]; confidence: number } => {
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return { legs: [], confidence: 0 };

  const normalizedBlock = rawText.toLowerCase();
  const matchedSport = Object.entries(SPORT_KEYWORDS).find(([key]) => normalizedBlock.includes(key))?.[1] ?? null;
  const matchedBook = BOOK_KEYWORDS.find((book) => normalizedBlock.includes(book)) ?? null;

  const parsedLegs = lines.map((line) => {
    const oddsMatch = line.match(/([+-]\d{3,4})/);
    const lineMatch = line.match(/(?:over|under|o|u|alt)\s*([0-9]+(?:\.[0-9]+)?)/i) ?? line.match(/([+-]?\d+(?:\.\d+)?)(?!.*[+-]\d{3,4})/);
    const market = MARKET_KEYWORDS.find((keyword) => line.toLowerCase().includes(keyword)) ?? null;

    const cleanedName = line
      .replace(/\([^)]+\)/g, ' ')
      .replace(/\b(over|under|alt|points|rebounds|assists|moneyline|spread|total|odds)\b/gi, ' ')
      .replace(/[+-]\d{3,4}/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const confidence = [oddsMatch, lineMatch, market].filter(Boolean).length / 3;

    return {
      sport: matchedSport?.sport ?? null,
      league: matchedSport?.league ?? null,
      eventDate: null,
      teamOrPlayer: cleanedName || line,
      marketType: market,
      line: toLine(lineMatch?.[1]),
      odds: oddsMatch ? Number(oddsMatch[1]) : null,
      book: matchedBook,
      confidence,
    } satisfies ParsedSlipLeg;
  });

  const confidence = parsedLegs.reduce((sum, leg) => sum + leg.confidence, 0) / parsedLegs.length;
  return { legs: confidence >= 0.25 ? parsedLegs : [], confidence };
};
