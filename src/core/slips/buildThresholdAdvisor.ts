import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import {
  buildConstructionReport,
  type ConstructionLeg,
  type ConstructionReport,
} from '@/src/core/slips/constructionIntelligence';
import type { ThresholdAlternative, ThresholdMove } from '@/src/core/slips/thresholdOptimizer';

export type BuildThresholdIdea = {
  id: string;
  player: string;
  marketType: SlipBuilderLeg['marketType'];
  matchup: string;
  line: number;
  bestPrice: number;
  consensusPrice: number;
  marketImpliedProb: number;
  sourceCount: number;
  recentForm?: SlipBuilderLeg['recentForm'];
  stepDown?: {
    line: number;
    bestPrice: number;
    consensusPrice: number;
    marketImpliedProb: number;
    sourceCount: number;
  };
  stepUp?: {
    line: number;
    bestPrice: number;
    consensusPrice: number;
    marketImpliedProb: number;
    sourceCount: number;
  };
};

export type TicketRiskSnapshot = {
  status: ConstructionReport['status'];
  pushedCount: number;
  pushBudget: number;
  budgetRemaining: number;
  pricedLegCount: number;
  totalLegs: number;
  priceStackProbability: number | null;
  priceStackComplete: boolean;
};

export type BuildThresholdMove = {
  kind: 'safety' | 'escalation';
  legId: string;
  player: string;
  marketType: SlipBuilderLeg['marketType'];
  currentLine: number;
  targetLine: number;
  currentProbability: number;
  targetProbability: number;
  probabilityDelta: number;
  bestPrice: string;
  consensusPrice: string;
  reason: string;
  before: TicketRiskSnapshot;
  after: TicketRiskSnapshot;
  priceStackDelta: number | null;
};

export type BuildThresholdAdvice = {
  baseline: TicketRiskSnapshot;
  report: ConstructionReport;
  safety: BuildThresholdMove | null;
  escalation: BuildThresholdMove | null;
};

const MARKET_LABELS: Partial<Record<SlipBuilderLeg['marketType'], string>> = {
  passing_yards: 'pass yards',
  passing_tds: 'pass TDs',
  rushing_yards: 'rush yards',
  receiving_yards: 'receiving yards',
  receptions: 'receptions',
  carries: 'carries',
  points: 'points',
  threes: 'threes',
  assists: 'assists',
  rebounds: 'rebounds',
  pra: 'PRA',
  ra: 'RA',
};

const finiteProbability = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 1;

const parseLine = (value: string): number | null => {
  const match = value.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeText = (value: string | undefined): string =>
  (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const sameThreshold = (a: number | null, b: number): boolean =>
  a !== null && Math.abs(a - b) < 0.001;

const formatAmericanOdds = (value: number): string => (value > 0 ? `+${value}` : String(value));

export const marketPointToDisplayedThreshold = (line: number): number => {
  if (!Number.isFinite(line)) return line;
  return Math.abs(line % 1) === 0.5 ? Math.floor(line) + 1 : line;
};

const normalizeAlternativeLine = (leg: SlipBuilderLeg, line: number): number =>
  leg.line.includes('+') ? marketPointToDisplayedThreshold(line) : line;

const formatThresholdLine = (
  marketType: SlipBuilderLeg['marketType'],
  targetLine: number,
): string => {
  if (marketType === 'anytime_td') return 'Anytime TD';
  const suffix = MARKET_LABELS[marketType] ?? marketType.replace(/_/g, ' ');
  return `${targetLine}+ ${suffix}`;
};

const asAlternative = (
  leg: SlipBuilderLeg,
  input: BuildThresholdIdea['stepDown'] | BuildThresholdIdea['stepUp'] | undefined,
): ThresholdAlternative | undefined => {
  if (!input) return undefined;
  return {
    line: normalizeAlternativeLine(leg, input.line),
    bestPrice: formatAmericanOdds(input.bestPrice),
    consensusPrice: formatAmericanOdds(input.consensusPrice),
    marketImpliedProb: input.marketImpliedProb,
    sourceCount: input.sourceCount,
  };
};

const ideaAsAlternative = (
  leg: SlipBuilderLeg,
  idea: BuildThresholdIdea,
): ThresholdAlternative => ({
  line: normalizeAlternativeLine(leg, idea.line),
  bestPrice: formatAmericanOdds(idea.bestPrice),
  consensusPrice: formatAmericanOdds(idea.consensusPrice),
  marketImpliedProb: idea.marketImpliedProb,
  sourceCount: idea.sourceCount,
});

export function enrichBuildLegFromIdea(
  leg: SlipBuilderLeg,
  idea: BuildThresholdIdea,
): SlipBuilderLeg {
  const currentLine = parseLine(leg.line);
  const ideaLine = normalizeAlternativeLine(leg, idea.line);
  const lower = asAlternative(leg, idea.stepDown);
  const higher = asAlternative(leg, idea.stepUp);

  if (sameThreshold(currentLine, ideaLine)) {
    return {
      ...leg,
      marketImpliedProb: idea.marketImpliedProb,
      consensusPrice: formatAmericanOdds(idea.consensusPrice),
      recentForm: idea.recentForm ?? leg.recentForm,
      adjacentAlt: lower,
      adjacentUpperAlt: higher,
    };
  }

  if (lower && sameThreshold(currentLine, lower.line) && idea.stepDown) {
    return {
      ...leg,
      marketImpliedProb: idea.stepDown.marketImpliedProb,
      consensusPrice: formatAmericanOdds(idea.stepDown.consensusPrice),
      recentForm: undefined,
      adjacentAlt: undefined,
      adjacentUpperAlt: ideaAsAlternative(leg, idea),
    };
  }

  if (higher && sameThreshold(currentLine, higher.line) && idea.stepUp) {
    return {
      ...leg,
      marketImpliedProb: idea.stepUp.marketImpliedProb,
      consensusPrice: formatAmericanOdds(idea.stepUp.consensusPrice),
      recentForm: undefined,
      adjacentAlt: ideaAsAlternative(leg, idea),
      adjacentUpperAlt: undefined,
    };
  }

  return {
    ...leg,
    adjacentAlt: leg.adjacentAlt
      ? { ...leg.adjacentAlt, line: normalizeAlternativeLine(leg, leg.adjacentAlt.line) }
      : undefined,
    adjacentUpperAlt: leg.adjacentUpperAlt
      ? { ...leg.adjacentUpperAlt, line: normalizeAlternativeLine(leg, leg.adjacentUpperAlt.line) }
      : undefined,
  };
}

const findIdeaForLeg = (
  leg: SlipBuilderLeg,
  ideas: BuildThresholdIdea[],
): BuildThresholdIdea | undefined => {
  const exact = ideas.find((idea) => idea.id === leg.id);
  if (exact) return exact;

  const player = normalizeText(leg.player);
  const candidates = ideas.filter(
    (idea) => normalizeText(idea.player) === player && idea.marketType === leg.marketType,
  );
  if (candidates.length <= 1) return candidates[0];

  const game = normalizeText(leg.game);
  if (!game) return candidates[0];
  return candidates.find((idea) => {
    const matchup = normalizeText(idea.matchup);
    return matchup === game || matchup.includes(game) || game.includes(matchup);
  }) ?? candidates[0];
};

export function enrichBuildSlipFromIdeas(
  legs: SlipBuilderLeg[],
  ideas: BuildThresholdIdea[],
): SlipBuilderLeg[] {
  return legs.map((leg) => {
    const idea = findIdeaForLeg(leg, ideas);
    if (!idea) {
      return {
        ...leg,
        adjacentAlt: leg.adjacentAlt
          ? { ...leg.adjacentAlt, line: normalizeAlternativeLine(leg, leg.adjacentAlt.line) }
          : undefined,
        adjacentUpperAlt: leg.adjacentUpperAlt
          ? { ...leg.adjacentUpperAlt, line: normalizeAlternativeLine(leg, leg.adjacentUpperAlt.line) }
          : undefined,
      };
    }
    return enrichBuildLegFromIdea(leg, idea);
  });
}

const snapshotFromReport = (report: ConstructionReport): TicketRiskSnapshot => {
  const priced = report.legs
    .map((leg) => leg.impliedProbability)
    .filter(finiteProbability);
  const priceStackProbability = priced.length > 0
    ? priced.reduce((product, probability) => product * probability, 1)
    : null;

  return {
    status: report.status,
    pushedCount: report.pushedCount,
    pushBudget: report.pushBudget,
    budgetRemaining: report.budgetRemaining,
    pricedLegCount: priced.length,
    totalLegs: report.legs.length,
    priceStackProbability,
    priceStackComplete: priced.length === report.legs.length && report.legs.length > 0,
  };
};

const currentAlternativeFromLeg = (
  leg: SlipBuilderLeg,
  currentLine: number,
  currentProbability: number,
  fallbackPrice: string,
): ThresholdAlternative => ({
  line: currentLine,
  bestPrice: leg.odds ?? leg.consensusPrice ?? fallbackPrice,
  consensusPrice: leg.consensusPrice ?? leg.odds ?? fallbackPrice,
  marketImpliedProb: currentProbability,
});

export function applyBuildThresholdMove(
  leg: SlipBuilderLeg,
  move: BuildThresholdMove,
): SlipBuilderLeg {
  if (leg.id !== move.legId) return leg;
  const current = currentAlternativeFromLeg(
    leg,
    move.currentLine,
    move.currentProbability,
    move.consensusPrice,
  );

  return {
    ...leg,
    line: formatThresholdLine(leg.marketType, move.targetLine),
    odds: move.bestPrice,
    marketImpliedProb: move.targetProbability,
    consensusPrice: move.consensusPrice,
    confidence: undefined,
    recentForm: undefined,
    adjacentAlt: move.kind === 'escalation' ? current : undefined,
    adjacentUpperAlt: move.kind === 'safety' ? current : undefined,
  };
}

const buildMove = (
  kind: BuildThresholdMove['kind'],
  sourceLeg: SlipBuilderLeg,
  constructionLeg: ConstructionLeg,
  thresholdMove: ThresholdMove,
  legs: SlipBuilderLeg[],
  before: TicketRiskSnapshot,
): BuildThresholdMove | null => {
  const currentLine = parseLine(sourceLeg.line);
  const currentProbability = constructionLeg.impliedProbability;
  if (currentLine === null || !finiteProbability(currentProbability)) return null;

  const provisional: BuildThresholdMove = {
    kind,
    legId: sourceLeg.id,
    player: sourceLeg.player,
    marketType: sourceLeg.marketType,
    currentLine,
    targetLine: thresholdMove.targetLine,
    currentProbability,
    targetProbability: thresholdMove.targetProbability,
    probabilityDelta: thresholdMove.probabilityDelta,
    bestPrice: thresholdMove.bestPrice,
    consensusPrice: thresholdMove.consensusPrice,
    reason: constructionLeg.thresholdOptimization.reason,
    before,
    after: before,
    priceStackDelta: null,
  };

  const movedLegs = legs.map((leg) => applyBuildThresholdMove(leg, provisional));
  const afterReport = buildConstructionReport(movedLegs);
  const after = snapshotFromReport(afterReport);
  const priceStackDelta = before.priceStackProbability !== null && after.priceStackProbability !== null
    ? after.priceStackProbability - before.priceStackProbability
    : null;

  return { ...provisional, after, priceStackDelta };
};

const safetyScore = (leg: ConstructionLeg): number => {
  const move = leg.thresholdOptimization.stepDown;
  if (!move) return Number.NEGATIVE_INFINITY;
  return (
    (leg.thresholdOptimization.decision === 'step_down' ? 1000 : 0)
    + (leg.tier === 'pushed' ? 200 : 0)
    + (leg.recentForm?.status === 'tension' ? 100 : 0)
    + move.probabilityDelta * 100
  );
};

export function buildBuildThresholdAdvice(legs: SlipBuilderLeg[]): BuildThresholdAdvice {
  const report = buildConstructionReport(legs);
  const baseline = snapshotFromReport(report);

  const safetyLeg = [...report.legs]
    .filter((leg) => Boolean(leg.thresholdOptimization.stepDown))
    .sort((a, b) => safetyScore(b) - safetyScore(a))[0];
  const safetySource = safetyLeg ? legs.find((leg) => leg.id === safetyLeg.legId) : undefined;
  const safetyMove = safetyLeg?.thresholdOptimization.stepDown;
  const safety = safetyLeg && safetySource && safetyMove
    ? buildMove('safety', safetySource, safetyLeg, safetyMove, legs, baseline)
    : null;

  const escalationLeg = report.escalationCandidates[0];
  const escalationSource = escalationLeg
    ? legs.find((leg) => leg.id === escalationLeg.legId)
    : undefined;
  const escalationMove = escalationLeg?.thresholdOptimization.stepUp;
  const escalation = escalationLeg && escalationSource && escalationMove
    ? buildMove('escalation', escalationSource, escalationLeg, escalationMove, legs, baseline)
    : null;

  return { baseline, report, safety, escalation };
}
