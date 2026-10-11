import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import type { MarketType } from '@/src/core/markets/marketType';
import type { TrackedTicketLeg } from '@/src/core/track/types';

// Initial beta: support the player props we can identify and explain.
// Do not silently convert a moneyline, unsupported sport, or unknown market to points.
export const REVIEW_MARKETS = {
  NFL: ['passing_yards', 'passing_tds', 'rushing_yards', 'rushing_receiving_yards', 'receiving_yards', 'receptions', 'carries', 'anytime_td'],
  NBA: ['points', 'threes', 'rebounds', 'assists', 'ra', 'pra'],
} as const satisfies Record<'NFL' | 'NBA', readonly MarketType[]>;

export type ReviewLeague = 'NFL' | 'NBA' | 'Unknown';
export type ReviewLeg = Omit<TrackedTicketLeg, 'league' | 'marketType'> & {
  league: ReviewLeague;
  marketType: MarketType | '';
};

export type ImportSource = 'screenshot' | 'paste';

export function toReviewLeg(leg: TrackedTicketLeg): ReviewLeg {
  const league: ReviewLeague = leg.league === 'NFL' || leg.league === 'NBA' ? leg.league : 'Unknown';
  const supported = league !== 'Unknown' && (REVIEW_MARKETS[league] as readonly string[]).includes(leg.marketType);
  return {
    ...leg,
    league,
    player: leg.player === 'Needs review' ? '' : leg.player,
    marketType: supported && leg.marketLabel !== 'Needs review' ? leg.marketType : '',
  };
}

export function newReviewLeg(id: string): ReviewLeg {
  return {
    legId: id,
    league: 'Unknown',
    player: '',
    rawPlayer: '',
    marketType: '',
    marketLabel: 'Needs review',
    threshold: 0,
    direction: 'over',
    source: 'manual',
    parseConfidence: 'low',
    needsReview: true,
  };
}

export function reviewLegIssues(leg: ReviewLeg): string[] {
  const problems: string[] = [];
  const player = leg.player.trim();
  if (!/^[\p{L}][\p{L}.'’-]*(?:\s+[\p{L}][\p{L}.'’-]*)+$/u.test(player) || player.toLowerCase() === 'needs review') {
    problems.push('Enter the full player name (first and last name).');
  }
  if (leg.league === 'Unknown') problems.push('Select NFL or NBA. Other sports are not supported in this beta.');
  if (!leg.marketType || leg.league === 'Unknown' ||
    !(REVIEW_MARKETS[leg.league] as readonly string[]).includes(leg.marketType)) {
    problems.push('Choose a supported market for this sport.');
  }
  if (!Number.isFinite(leg.threshold) || leg.threshold <= 0 || leg.threshold > 1000) {
    problems.push('Enter a valid positive threshold.');
  }
  if (leg.marketType === 'anytime_td' && (leg.threshold !== 1 || leg.direction !== 'over')) {
    problems.push('Anytime touchdown requires 1+ (over).');
  }
  if (leg.odds?.trim() && !/^[+-]\d{2,4}$/.test(leg.odds.trim())) {
    problems.push('Use American odds such as -110 or +125, or leave price blank.');
  }
  return problems;
}

export function reviewTicketIssues(legs: ReviewLeg[]): string[] {
  const problems: string[] = [];
  if (legs.length === 0) problems.push('Add at least one selection.');
  if (legs.length > 16) problems.push('Review up to 16 selections at a time.');
  for (const [index, leg] of legs.entries()) {
    for (const problem of reviewLegIssues(leg)) {
      problems.push('Selection ' + (index + 1) + ': ' + problem);
    }
  }
  return problems;
}

// A user's explicit field-by-field check is "reviewed", never provider "verified".
export function toReviewedDraftLegs(legs: ReviewLeg[], source: ImportSource): SlipBuilderLeg[] {
  const issues = reviewTicketIssues(legs);
  if (issues.length) throw new Error(issues[0]);
  return legs.map((leg) => ({
    id: leg.legId,
    player: leg.player.trim(),
    marketType: leg.marketType as MarketType,
    line: leg.marketType === 'anytime_td'
      ? '1+'
      : leg.ladder && leg.direction === 'over'
        ? String(leg.threshold) + '+'
        : (leg.direction === 'under' ? 'Under ' : 'Over ') + leg.threshold,
    odds: leg.odds?.trim() || undefined,
    game: leg.teams?.trim() || leg.gameId?.trim() || undefined,
    importSource: source,
    reviewState: 'reviewed',
  }));
}
