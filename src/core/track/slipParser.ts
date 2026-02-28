import { asMarketType, type MarketType } from '@/src/core/markets/marketType';
import type { ParseConfidence, TrackedTicketLeg } from '@/src/core/track/types';

const MARKET_TOKEN_MAP: Array<{ pattern: RegExp; marketType: MarketType; label: string }> = [
  { pattern: /\bmoneyline\b/i, marketType: 'moneyline', label: 'Moneyline' },
  { pattern: /\bpra\b|points\s*\+\s*rebounds\s*\+\s*assists/i, marketType: 'pra', label: 'PRA' },
  { pattern: /\b3\s*(pt|pointer)|threes?\b/i, marketType: 'threes', label: 'Threes' },
  { pattern: /\bassists?\b/i, marketType: 'assists', label: 'Assists' },
  { pattern: /\brebounds?\b/i, marketType: 'rebounds', label: 'Rebounds' },
  { pattern: /\bpoints?\b/i, marketType: 'points', label: 'Points' },
];

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
    .replace(/\s+/g, ' ')
    .trim();
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
  const odds = input.match(/(^|\s)([+-]\d{3,5})(?=\s|$)/);
  return odds?.[2];
}

function parseTeams(input: string): { teams?: string; gameId?: string } {
  const atMatch = input.match(/\b([A-Z]{2,4})\s*@\s*([A-Z]{2,4})\b/);
  if (atMatch) {
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
    .replace(/\b(OVER|UNDER)\b.*$/i, '')
    .replace(/\bTO\s+(SCORE|RECORD)\b.*$/i, '')
    .replace(/\b\d+(?:\.\d+)?\+?\b/g, '')
    .replace(/\b(POINTS?|ASSISTS?|REBOUNDS?|PRA|THREES?|MONEYLINE)\b/gi, '')
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

export function parseSlipTextToLegs(rawText: string, sourceHint: string): TrackedTicketLeg[] {
  const lines = nonEmptyLines(rawText);
  if (lines.length === 0) {
    return [{
      legId: 'leg-1',
      league: 'NBA',
      player: 'Needs review',
      rawPlayer: '',
      marketType: 'points',
      marketLabel: 'Needs review',
      threshold: 0,
      direction: 'over',
      source: sourceHint,
      parseConfidence: 'low',
      needsReview: true,
      rawText: rawText.trim() || 'Unparsed leg'
    }];
  }

  return lines.map((line, index) => {
    const { marketType, marketLabel, inferred } = canonicalMarket(line);
    const direction = parseDirection(line);
    const { threshold, ladder } = parseThreshold(line);
    const odds = parseOdds(line);
    const player = inferPlayer(line);
    const teamDetails = parseTeams(line);
    const unresolved = threshold == null || marketLabel === 'Needs review';
    const parseConfidence = confidenceFor({ player, inferredMarket: inferred, threshold, unresolved });

    return {
      legId: `leg-${index + 1}`,
      league: /\b(nfl)\b/i.test(line) ? 'NFL' : 'NBA',
      player,
      rawPlayer: player,
      marketType,
      marketLabel,
      threshold: threshold ?? 0,
      direction,
      odds,
      source: sourceHint,
      parseConfidence,
      needsReview: parseConfidence === 'low',
      rawText: line,
      ladder,
      teams: teamDetails.teams,
      gameId: teamDetails.gameId,
    };
  });
}
