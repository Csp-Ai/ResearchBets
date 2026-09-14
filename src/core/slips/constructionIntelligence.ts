import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';

export type ConstructionTier = 'floor' | 'core' | 'pushed';
export type ConstructionStatus = 'balanced' | 'watch' | 'overloaded';

export type ConstructionLeg = {
  legId: string;
  player: string;
  marketType: SlipBuilderLeg['marketType'];
  line: string;
  tier: ConstructionTier;
  reason: string;
  impliedProbability: number | null;
  shortWindow: boolean;
  suggestedTarget: string | null;
};

export type ConstructionReport = {
  legs: ConstructionLeg[];
  counts: Record<ConstructionTier, number>;
  pushBudget: number;
  pushedCount: number;
  budgetRemaining: number;
  status: ConstructionStatus;
  headline: string;
  summary: string;
  repairCandidates: ConstructionLeg[];
};

const FLOOR_PROBABILITY = 0.75;
const PUSHED_PROBABILITY = 0.62;

const parseNumber = (value: string): number | null => {
  const match = value.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const americanOddsToProbability = (value?: string): number | null => {
  if (!value || !/^[+-]?\d+$/.test(value.trim())) return null;
  const odds = Number(value);
  if (!Number.isFinite(odds) || odds === 0) return null;
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
};

const hasShortWindow = (leg: SlipBuilderLeg): boolean =>
  /\b(1q|1st\s*quarter|first\s*quarter|1h|1st\s*half|first\s*half)\b/i.test(
    `${leg.line} ${leg.game ?? ''}`,
  );

const fallbackTier = (leg: SlipBuilderLeg, line: number | null): ConstructionTier => {
  if (leg.marketType === 'anytime_td') return 'pushed';
  if (line == null) return 'core';

  switch (leg.marketType) {
    case 'passing_yards':
      if (line <= 225) return 'floor';
      if (line >= 275) return 'pushed';
      return 'core';
    case 'passing_tds':
      return line >= 2 ? 'pushed' : 'core';
    case 'rushing_yards':
      if (line <= 40) return 'floor';
      if (line >= 70) return 'pushed';
      return 'core';
    case 'receiving_yards':
      if (line <= 40) return 'floor';
      if (line >= 70) return 'pushed';
      return 'core';
    case 'receptions':
      if (line <= 3) return 'floor';
      if (line >= 6) return 'pushed';
      return 'core';
    case 'carries':
      if (line <= 12) return 'floor';
      if (line >= 18) return 'pushed';
      return 'core';
    case 'points':
      if (line <= 20) return 'floor';
      if (line >= 30) return 'pushed';
      return 'core';
    case 'threes':
      if (line <= 2.5) return 'floor';
      if (line >= 4.5) return 'pushed';
      return 'core';
    case 'assists':
      if (line <= 5.5) return 'floor';
      if (line >= 9.5) return 'pushed';
      return 'core';
    case 'rebounds':
      if (line <= 6.5) return 'floor';
      if (line >= 11.5) return 'pushed';
      return 'core';
    case 'pra':
      if (line <= 30) return 'floor';
      if (line >= 45) return 'pushed';
      return 'core';
    case 'ra':
      if (line <= 10) return 'floor';
      if (line >= 18) return 'pushed';
      return 'core';
    default:
      return 'core';
  }
};

const suggestedTargetFor = (leg: SlipBuilderLeg, tier: ConstructionTier): string | null => {
  if (tier !== 'pushed') return null;
  switch (leg.marketType) {
    case 'passing_yards': return '250 or lower';
    case 'passing_tds': return '1+ passing TD, or swap to passing volume';
    case 'rushing_yards': return '60 or lower';
    case 'receiving_yards': return '60 or lower';
    case 'receptions': return '5 or lower';
    case 'carries': return '16 or lower';
    case 'anytime_td': return 'Prefer a volume prop if the same player read supports one';
    case 'points': return '25 or lower';
    case 'threes': return '3+ or lower';
    case 'assists': return '8 or lower';
    case 'rebounds': return '9 or lower';
    case 'pra': return '40 or lower';
    case 'ra': return '15 or lower';
    default: return null;
  }
};

const tierReason = (input: {
  leg: SlipBuilderLeg;
  tier: ConstructionTier;
  impliedProbability: number | null;
  shortWindow: boolean;
}): string => {
  if (input.shortWindow) {
    return 'Short-window prop: fewer opportunities to recover from sequencing variance.';
  }
  if (input.leg.marketType === 'anytime_td') {
    return 'Binary scoring event: the player read can be directionally right without the touchdown arriving.';
  }
  if (input.impliedProbability !== null) {
    const pct = Math.round(input.impliedProbability * 100);
    if (input.tier === 'floor') return `${pct}% sportsbook-price implied probability supports a floor-oriented role.`;
    if (input.tier === 'pushed') return `${pct}% sportsbook-price implied probability makes this one of the ticket's payout-seeking asks.`;
    return `${pct}% sportsbook-price implied probability sits in the ticket's core range.`;
  }
  if (input.tier === 'pushed') return 'The threshold is structurally aggressive for this market type.';
  if (input.tier === 'floor') return 'The threshold is structurally conservative for this market type.';
  return 'The threshold sits between floor and pushed construction bands.';
};

const pushBudgetFor = (legCount: number): number => {
  if (legCount <= 3) return 1;
  if (legCount <= 7) return 1;
  return 2;
};

export function classifyConstructionLeg(leg: SlipBuilderLeg): ConstructionLeg {
  const impliedProbability = americanOddsToProbability(leg.odds);
  const shortWindow = hasShortWindow(leg);
  const line = parseNumber(leg.line);

  let tier: ConstructionTier;
  if (shortWindow) tier = 'pushed';
  else if (leg.marketType === 'anytime_td') tier = 'pushed';
  else if (impliedProbability !== null && impliedProbability >= FLOOR_PROBABILITY) tier = 'floor';
  else if (impliedProbability !== null && impliedProbability < PUSHED_PROBABILITY) tier = 'pushed';
  else tier = fallbackTier(leg, line);

  return {
    legId: leg.id,
    player: leg.player,
    marketType: leg.marketType,
    line: leg.line,
    tier,
    reason: tierReason({ leg, tier, impliedProbability, shortWindow }),
    impliedProbability,
    shortWindow,
    suggestedTarget: shortWindow
      ? 'Prefer the equivalent full-game volume angle when available'
      : suggestedTargetFor(leg, tier),
  };
}

export function buildConstructionReport(slip: SlipBuilderLeg[]): ConstructionReport {
  const legs = slip.map(classifyConstructionLeg);
  const counts = legs.reduce<Record<ConstructionTier, number>>(
    (acc, leg) => ({ ...acc, [leg.tier]: acc[leg.tier] + 1 }),
    { floor: 0, core: 0, pushed: 0 },
  );
  const pushBudget = pushBudgetFor(legs.length);
  const pushedCount = counts.pushed;
  const budgetRemaining = pushBudget - pushedCount;
  const status: ConstructionStatus =
    pushedCount > pushBudget
      ? 'overloaded'
      : pushedCount === pushBudget && pushedCount > 0
        ? 'watch'
        : 'balanced';

  const headline =
    status === 'overloaded'
      ? 'Push budget exceeded.'
      : status === 'watch'
        ? 'Push budget fully allocated.'
        : 'Ticket construction is balanced.';

  const summary =
    status === 'overloaded'
      ? `${pushedCount} legs are asking for above-floor outcomes. Keep the strongest reads, but lower or remove ${pushedCount - pushBudget} pushed leg${pushedCount - pushBudget === 1 ? '' : 's'} before adding more payout pressure.`
      : status === 'watch'
        ? `This ticket is using all ${pushBudget} of its pushed-threshold slot${pushBudget === 1 ? '' : 's'}. Additional upgrades should come from price, not higher asks.`
        : `Only ${pushedCount} of ${pushBudget} pushed-threshold slot${pushBudget === 1 ? '' : 's'} ${pushedCount === 1 ? 'is' : 'are'} in use. The rest of the ticket is floor/core oriented.`;

  const repairCandidates = legs
    .filter((leg) => leg.tier === 'pushed')
    .sort((a, b) => {
      const aProb = a.impliedProbability ?? 1;
      const bProb = b.impliedProbability ?? 1;
      if (a.shortWindow !== b.shortWindow) return a.shortWindow ? -1 : 1;
      return aProb - bProb;
    });

  return {
    legs,
    counts,
    pushBudget,
    pushedCount,
    budgetRemaining,
    status,
    headline,
    summary,
    repairCandidates,
  };
}
