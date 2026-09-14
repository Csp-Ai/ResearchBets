import { asMarketType, type MarketType } from '../markets/marketType';

export type ParsedSlipLeg = {
  sport: string | null;
  league: string | null;
  eventDate: string | null;
  teamOrPlayer: string;
  marketType: MarketType | null;
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
const BOOK_PATTERN = new RegExp(`\\b(?:${BOOK_KEYWORDS.join('|')})\\b`, 'gi');

const MARKET_PATTERNS: Array<{ market: MarketType; pattern: RegExp }> = [
  { market: 'passing_yards', pattern: /\b(?:passing|pass)\s+(?:yards?|yds?)\b/i },
  { market: 'passing_tds', pattern: /\b(?:passing|pass)\s+(?:touchdowns?|tds?)\b/i },
  { market: 'rushing_yards', pattern: /\b(?:rushing|rush)\s+(?:yards?|yds?)\b/i },
  { market: 'receiving_yards', pattern: /\b(?:receiving|rec)\s+(?:yards?|yds?)\b/i },
  { market: 'receptions', pattern: /\b(?:receptions?|catches)\b/i },
  { market: 'carries', pattern: /\b(?:carries|rush(?:ing)?\s+attempts?)\b/i },
  { market: 'anytime_td', pattern: /\b(?:any\s*time|anytime)\s+(?:touchdown|td)(?:\s+scorer)?\b|\battd\b/i },
  { market: 'points', pattern: /\b(?:points?|pts)\b/i },
  { market: 'rebounds', pattern: /\b(?:rebounds?|reb)\b/i },
  { market: 'assists', pattern: /\b(?:assists?|ast)\b/i },
  { market: 'threes', pattern: /\b(?:threes|3pm|3-pointers?)\b/i },
  { market: 'pra', pattern: /\bpra\b/i },
  { market: 'ra', pattern: /\bra\b/i },
  { market: 'moneyline', pattern: /\b(?:moneyline|ml)\b/i },
  { market: 'spread', pattern: /\bspread\b/i },
  { market: 'total', pattern: /\btotal\b/i },
];

const inferMarket = (line: string): MarketType | null => {
  const matched = MARKET_PATTERNS.find(({ pattern }) => pattern.test(line));
  return matched ? asMarketType(matched.market, matched.market) : null;
};

const toLine = (line: string | undefined): number | null => {
  if (!line) return null;
  const parsed = Number(line);
  return Number.isFinite(parsed) ? parsed : null;
};

const extractThreshold = (line: string): RegExpMatchArray | null =>
  line.match(/(?:over|under|\bo\b|\bu\b|alt)\s*([0-9]+(?:\.[0-9]+)?)/i) ??
  line.match(/\b([0-9]+(?:\.[0-9]+)?)\s*\+/) ??
  line.match(/\b([0-9]+(?:\.[0-9]+)?)\b(?!.*[+-]\d{3,4})/);

const cleanSelection = (line: string, market: MarketType | null): string => {
  let cleaned = line
    .replace(/\([^)]+\)/g, ' ')
    .replace(/[+-]\d{3,4}/g, ' ')
    .replace(BOOK_PATTERN, ' ');

  for (const { pattern } of MARKET_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  cleaned = cleaned
    .replace(/\b(?:over|under|alt|odds|nfl|nba|mlb|nhl|ufc)\b/gi, ' ')
    .replace(/\b[ou]\s*(?=\d)/gi, ' ')
    .replace(/\b\d+(?:\.\d+)?\s*\+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (market === 'anytime_td') {
    cleaned = cleaned.replace(/\bscorer\b/gi, ' ').replace(/\s+/g, ' ').trim();
  }

  return cleaned;
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

  const parsedLegs = lines
    .map((line) => {
      const oddsMatch = line.match(/([+-]\d{3,4})/);
      const lineMatch = extractThreshold(line);
      const market = inferMarket(line);
      const cleanedName = cleanSelection(line, market);

      const confidenceSignals = [market, lineMatch, oddsMatch, matchedSport];
      const confidence = confidenceSignals.filter(Boolean).length / confidenceSignals.length;

      return {
        sport: matchedSport?.sport ?? null,
        league: matchedSport?.league ?? null,
        eventDate: null,
        teamOrPlayer: cleanedName || line,
        marketType: market,
        line: market === 'anytime_td' && !lineMatch ? 1 : toLine(lineMatch?.[1]),
        odds: oddsMatch ? Number(oddsMatch[1]) : null,
        book: matchedBook,
        confidence,
      } satisfies ParsedSlipLeg;
    })
    .filter((leg) => leg.marketType !== null);

  if (parsedLegs.length === 0) return { legs: [], confidence: 0 };

  const confidence = parsedLegs.reduce((sum, leg) => sum + leg.confidence, 0) / parsedLegs.length;
  return { legs: confidence >= 0.25 ? parsedLegs : [], confidence };
};
