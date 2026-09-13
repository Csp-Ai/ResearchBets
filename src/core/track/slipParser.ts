import { asMarketType, type MarketType } from '@/src/core/markets/marketType';
import type { ParseConfidence, TrackedTicketLeg } from '@/src/core/track/types';

const MARKET_TOKEN_MAP: Array<{ pattern: RegExp; marketType: MarketType; label: string }> = [
  { pattern: /\b(?:passing|pass)\s+(?:yards?|yds?)\b/i, marketType: 'passing_yards', label: 'Passing yards' },
  { pattern: /\b(?:passing|pass)\s+(?:touchdowns?|tds?)\b/i, marketType: 'passing_tds', label: 'Passing TDs' },
  { pattern: /\b(?:rushing|rush)\s+(?:yards?|yds?)\b/i, marketType: 'rushing_yards', label: 'Rushing yards' },
  { pattern: /\b(?:receiving|rec)\s+(?:yards?|yds?)\b/i, marketType: 'receiving_yards', label: 'Receiving yards' },
  { pattern: /\b(?:receptions?|catches)\b/i, marketType: 'receptions', label: 'Receptions' },
  { pattern: /\b(?:carries|rush(?:ing)?\s+attempts?)\b/i, marketType: 'carries', label: 'Carries' },
  { pattern: /\b(?:any\s*time|anytime)\s+(?:touchdown|td)(?:\s+scorer)?\b|\battd\b|\bto\s+score(?:\s+a)?\s+touchdown\b/i, marketType: 'anytime_td', label: 'Anytime TD' },
  { pattern: /\bmoneyline\b/i, marketType: 'moneyline', label: 'Moneyline' },
  { pattern: /\bpra\b|points\s*\+\s*rebounds\s*\+\s*assists/i, marketType: 'pra', label: 'PRA' },
  { pattern: /\b3\s*(pt|pointer)|threes?\b/i, marketType: 'threes', label: 'Threes' },
  { pattern: /\bassists?\b/i, marketType: 'assists', label: 'Assists' },
  { pattern: /\brebounds?\b/i, marketType: 'rebounds', label: 'Rebounds' },
  { pattern: /\bpoints?\b/i, marketType: 'points', label: 'Points' },
];

const NFL_MARKETS = new Set<MarketType>([
  'passing_yards',
  'passing_tds',
  'rushing_yards',
  'receiving_yards',
  'receptions',
  'carries',
  'anytime_td',
]);

const ALT_DESCRIPTOR = /^(.+?)\s*-\s*ALT\s+(PASSING|RUSHING|RECEIVING)\s+(YDS?|YARDS?|TDS?|TOUCHDOWNS?|ATTEMPTS?|RECEPTIONS?)$/i;
const GENERIC_PLUS_PROP = /^(.+?)\s+(\d+(?:\.\d+)?)\+\s+(YARDS?|RECEPTIONS?|CARRIES|PASSING\s+TOUCHDOWNS?)(?:\s+([+-]\d{2,5}))?(?:\s+([A-Z]{2,4}\s*@\s*[A-Z]{2,4}))?$/i;

function canonicalMarket(input: string): { marketType: MarketType; marketLabel: string; inferred: boolean } {
  for (const token of MARKET_TOKEN_MAP) {
    if (token.pattern.test(input)) {
      return { marketType: token.marketType, marketLabel: token.label, inferred: false };
    }
  }
  return { marketType: asMarketType(undefined, 'points'), marketLabel: 'Needs review', inferred: true };
}

function normalizePlayerName(input: string): string {
  return input
    .replace(/[|*_~`]+/g, ' ')
    .replace(/[.,;:!?]+$/g, '')
    .replace(/[+-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function comparablePlayer(input: string): string {
  return normalizePlayerName(input)
    .toLowerCase()
    .replace(/[^a-z0-9']/g, '');
}

function descriptorMarket(line: string): { player: string; market: string } | null {
  const match = line.match(ALT_DESCRIPTOR);
  if (!match?.[1] || !match[2] || !match[3]) return null;
  const family = match[2].toLowerCase();
  const unit = match[3].toLowerCase();
  let market = `${family} yards`;
  if (unit.startsWith('td') || unit.startsWith('touchdown')) market = 'passing touchdowns';
  else if (unit.startsWith('attempt')) market = 'carries';
  else if (unit.startsWith('reception')) market = 'receptions';
  return { player: normalizePlayerName(match[1]), market };
}

function coalesceSportsbookFragments(lines: string[]): string[] {
  const output: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index]!;
    const next = lines[index + 1];
    const main = current.match(GENERIC_PLUS_PROP);
    const descriptor = next ? descriptorMarket(next) : null;

    if (main?.[1] && main[2] && descriptor && comparablePlayer(main[1]) === comparablePlayer(descriptor.player)) {
      const player = normalizePlayerName(main[1]);
      const threshold = main[2];
      const odds = main[4] ? ` ${main[4]}` : '';
      const teams = main[5] ? ` ${main[5]}` : '';
      output.push(`${player} over ${threshold} ${descriptor.market}${odds}${teams}`);
      index += 1;
      continue;
    }

    output.push(current);
  }
  return output;
}

function parseDirection(input: string): 'over' | 'under' {
  if (/\bunder\b/i.test(input)) return 'under';
  return 'over';
}

function parseThreshold(input: string): { threshold?: number; ladder: boolean } {
  const plus = input.match(/(\d+(?:\.\d+)?)\s*\+/i);
  if (plus) return { threshold: Number(plus[1]), ladder: true };

  const decimal = input.match(/\b(over|under)\s*(\d+(?:\.\d+)?)/i) ?? input.match(/\b(\d+(?:\.\d+)?)\b/);
  if (decimal) return { threshold: Number(decimal[2] ?? decimal[1]), ladder: false };

  return { threshold: undefined, ladder: false };
}

function parseOdds(input: string): string | undefined {
  const odds = input.match(/(^|\s)([+-]\d{2,5})(?=\s|$)/);
  return odds?.[2];
}

function parseTeams(input: string): { teams?: string; gameId?: string } {
  const atMatch = input.match(/\b([A-Z]{2,4})\s*@\s*([A-Z]{2,4})\b/);
  if (atMatch?.[1] && atMatch?.[2]) {
    return { teams: `${atMatch[1]} @ ${atMatch[2]}`, gameId: `${atMatch[1]}@${atMatch[2]}` };
  }

  const vsMatch = input.match(/\b([A-Z]{2,4})\s*(?:vs\.?|v\.?|-)\s*([A-Z]{2,4})\b/i);
  if (vsMatch?.[1] && vsMatch?.[2]) {
    const home = vsMatch[1].toUpperCase();
    const away = vsMatch[2].toUpperCase();
    return { teams: `${home} @ ${away}`, gameId: `${home}@${away}` };
  }

  return {};
}

function inferPlayer(input: string): string {
  const stripped = input
    .replace(/(^|\s)[+-]\d{2,5}\b/g, ' ')
    .replace(/\b(OVER|UNDER)\b.*$/i, '')
    .replace(/\bTO\s+(SCORE|RECORD)\b.*$/i, '')
    .replace(/\b\d+(?:\.\d+)?\+?\b/g, '')
    .replace(/\b(POINTS?|ASSISTS?|REBOUNDS?|PRA|THREES?|MONEYLINE|PASS(?:ING)?\s+(?:YARDS?|YDS?|TDS?|TOUCHDOWNS?)|RUSH(?:ING)?\s+(?:YARDS?|YDS?|ATTEMPTS?)|RECEIV(?:ING)?\s+(?:YARDS?|YDS?)|REC\s+(?:YARDS?|YDS?)|RECEPTIONS?|CATCHES|CARRIES|ANYTIME\s+(?:TD|TOUCHDOWN))\b/gi, '')
    .replace(/\bALT\b/gi, '')
    .replace(/\b([A-Z]{2,4})\s*@\s*([A-Z]{2,4})\b/g, '')
    .trim();

  const cleaned = normalizePlayerName(stripped);
  if (cleaned.length > 1) return cleaned;

  const prefix = input.split(/\s+(OVER|UNDER|TO)\b/i)[0] ?? '';
  return normalizePlayerName(prefix) || 'Needs review';
}

function confidenceFor(input: { player: string; inferredMarket: boolean; threshold?: number; unresolved: boolean }): ParseConfidence {
  if (input.unresolved || input.player === 'Needs review') return 'low';
  if (input.threshold == null) return 'low';
  if (input.inferredMarket) return 'medium';
  return 'high';
}

function nonEmptyLines(rawText: string): string[] {
  return rawText.split('\n').map((line) => line.trim()).filter(Boolean);
}

function looksLikeCandidateLeg(line: string): boolean {
  if (!canonicalMarket(line).inferred) return true;
  if (/\b(over|under)\s+\d+(?:\.\d+)?\b/i.test(line)) return true;
  if (/\b\d+(?:\.\d+)?\+\s+(?:yards?|receptions?|carries|passing\s+touchdowns?)\b/i.test(line)) return true;

  const americanOdds = /(^|\s)[+-]\d{2,5}\b/.test(line);
  const withoutOdds = line.replace(/(^|\s)[+-]\d{2,5}\b/g, ' ');
  if (americanOdds && /\d+(?:\.\d+)?/.test(withoutOdds) && /[A-Za-z]{3}/.test(withoutOdds)) return true;
  return false;
}

function unresolvedFallback(rawText: string, sourceHint: string): TrackedTicketLeg[] {
  return [{
    legId: 'leg-1',
    league: 'Unknown',
    player: 'Needs review',
    rawPlayer: '',
    marketType: 'points',
    marketLabel: 'Needs review',
    threshold: 0,
    direction: 'over',
    source: sourceHint,
    parseConfidence: 'low',
    needsReview: true,
    rawText: rawText.trim() || 'Unparsed leg',
  }];
}

export function parseSlipTextToLegs(rawText: string, sourceHint: string): TrackedTicketLeg[] {
  const rawLines = nonEmptyLines(rawText);
  if (rawLines.length === 0) return unresolvedFallback(rawText, sourceHint);

  const lines = coalesceSportsbookFragments(rawLines).filter(looksLikeCandidateLeg);
  if (lines.length === 0) return unresolvedFallback(rawText, sourceHint);

  return lines.map((line, index) => {
    const { marketType, marketLabel, inferred } = canonicalMarket(line);
    const direction = parseDirection(line);
    const parsedThreshold = marketType === 'anytime_td'
      ? { threshold: 1, ladder: false }
      : parseThreshold(line);
    const odds = parseOdds(line);
    const player = inferPlayer(line);
    const teamDetails = parseTeams(line);
    const unresolved = parsedThreshold.threshold == null || marketLabel === 'Needs review';
    const parseConfidence = confidenceFor({
      player,
      inferredMarket: inferred,
      threshold: parsedThreshold.threshold,
      unresolved,
    });
    const league = NFL_MARKETS.has(marketType) || /\bNFL\b/i.test(line) ? 'NFL' : 'NBA';

    return {
      legId: `leg-${index + 1}`,
      league,
      player,
      rawPlayer: player,
      marketType,
      marketLabel,
      threshold: parsedThreshold.threshold ?? 0,
      direction,
      odds,
      source: sourceHint,
      parseConfidence,
      needsReview: parseConfidence === 'low',
      rawText: line,
      ladder: parsedThreshold.ladder,
      teams: teamDetails.teams,
      gameId: teamDetails.gameId,
    };
  });
}