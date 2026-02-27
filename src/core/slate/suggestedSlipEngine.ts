import type { MarketType } from '@/src/core/markets/marketType';

import type { SlateSummary } from './slateEngine';

export type BoardProp = {
  id: string;
  player: string;
  market: MarketType;
  line: string;
  odds: string;
  hitRateL10: number;
  riskTag: 'stable' | 'watch';
  gameId: string;
};

export type SuggestedSlip = {
  profile: 'stable' | 'balanced' | 'ceiling';
  legs: BoardProp[];
  estimatedOdds: string;
  survivalProbability: number;
  weakestLegId: string;
  convictionScore: number;
  reasoning: string;
};

const isHighVarianceMarket = (market: MarketType) => market === 'threes' || market === 'points';

const marketVolatilityPenalty = (market: MarketType) => {
  if (market === 'threes' || market === 'points') return 0.18;
  if (market === 'rebounds' || market === 'assists') return 0.1;
  return 0.08;
};

const clamp = (num: number, min: number, max: number) => Math.max(min, Math.min(max, num));

function impliedProbability(leg: BoardProp) {
  return clamp(leg.hitRateL10 / 100, 0.05, 0.95);
}

function riskScore(leg: BoardProp) {
  const riskTagPenalty = leg.riskTag === 'stable' ? 0.15 : 0.35;
  const hitRatePenalty = 1 - impliedProbability(leg);
  return riskTagPenalty + hitRatePenalty + marketVolatilityPenalty(leg.market);
}

function estimateAmericanOdds(survivalProbability: number) {
  const p = clamp(survivalProbability, 0.03, 0.9);
  const plus = Math.max(100, Math.round(((1 / p) - 1) * 100));
  return `~+${plus}`;
}

function buildSlip(profile: SuggestedSlip['profile'], legs: BoardProp[], reactive: boolean): SuggestedSlip {
  const legProbabilities = legs.map((leg) => impliedProbability(leg));
  const rawSurvival = legProbabilities.reduce((product, current) => product * current, 1);
  const highVarianceCount = legs.filter((leg) => isHighVarianceMarket(leg.market)).length;
  const volatilityAdjustment = 1 - (legs.length - 1) * 0.03 - highVarianceCount * 0.035 - (reactive ? 0.01 : 0);
  const survivalProbability = clamp(rawSurvival * clamp(volatilityAdjustment, 0.65, 0.98), 0.01, 0.95);

  const weakestLeg = legs
    .map((leg) => ({ leg, score: riskScore(leg), probability: impliedProbability(leg) }))
    .sort((a, b) => (b.score - a.score) || (a.probability - b.probability))[0]?.leg;

  const avgHitRate = legs.reduce((sum, leg) => sum + leg.hitRateL10, 0) / Math.max(1, legs.length);
  const convictionScore = clamp(
    Math.round((survivalProbability * 72) + (avgHitRate * 0.45) - (highVarianceCount * 7) - (reactive ? 3 : 0)),
    0,
    100
  );

  const reasoningByProfile: Record<SuggestedSlip['profile'], string> = {
    stable: 'Stable build prioritizes minutes + role props and limits pure scorer variance to keep the ticket alive deeper into the slate.',
    balanced: 'Balanced build mixes peripherals with one ceiling leg so you get upside without stacking fragile volatility.',
    ceiling: 'Ceiling build takes 2 volatility shots but avoids stacking 3PT chaos, leaning on game diversity for controlled upside.'
  };

  return {
    profile,
    legs,
    estimatedOdds: estimateAmericanOdds(survivalProbability),
    survivalProbability,
    weakestLegId: weakestLeg?.id ?? legs[0]?.id ?? '',
    convictionScore,
    reasoning: reasoningByProfile[profile]
  };
}

function rankBoard(board: BoardProp[], profile: SuggestedSlip['profile'], reactive: boolean) {
  return [...board].sort((a, b) => {
    const aVariancePenalty = isHighVarianceMarket(a.market) ? 0.12 : 0;
    const bVariancePenalty = isHighVarianceMarket(b.market) ? 0.12 : 0;
    const aStableBoost = a.riskTag === 'stable' ? 0.06 : 0;
    const bStableBoost = b.riskTag === 'stable' ? 0.06 : 0;
    const reactivePenaltyA = reactive && isHighVarianceMarket(a.market) ? 0.08 : 0;
    const reactivePenaltyB = reactive && isHighVarianceMarket(b.market) ? 0.08 : 0;
    const profilePenaltyA = profile === 'ceiling' ? 0 : aVariancePenalty;
    const profilePenaltyB = profile === 'ceiling' ? 0 : bVariancePenalty;
    const scoreA = impliedProbability(a) + aStableBoost - profilePenaltyA - reactivePenaltyA;
    const scoreB = impliedProbability(b) + bStableBoost - profilePenaltyB - reactivePenaltyB;
    return scoreB - scoreA;
  });
}

function chooseLegs(
  ranked: BoardProp[],
  legCount: number,
  options: { minStable: number; maxHighVariance: number; uniquePlayers: boolean; minGames: number }
) {
  const chosen: BoardProp[] = [];
  const playerSet = new Set<string>();
  let highVarianceCount = 0;

  for (const leg of ranked) {
    if (chosen.length >= legCount) break;
    if (options.uniquePlayers && playerSet.has(leg.player)) continue;
    if (isHighVarianceMarket(leg.market) && highVarianceCount >= options.maxHighVariance) continue;

    chosen.push(leg);
    playerSet.add(leg.player);
    if (isHighVarianceMarket(leg.market)) highVarianceCount += 1;
  }

  if (chosen.length < legCount) {
    for (const leg of ranked) {
      if (chosen.length >= legCount) break;
      if (chosen.some((picked) => picked.id === leg.id)) continue;
      chosen.push(leg);
    }
  }

  const stableCount = chosen.filter((leg) => leg.riskTag === 'stable').length;
  if (stableCount < options.minStable) {
    const stablePool = ranked.filter((leg) => leg.riskTag === 'stable' && !chosen.some((picked) => picked.id === leg.id));
    for (const stableLeg of stablePool) {
      const replacementIndex = chosen.findIndex((leg) => leg.riskTag !== 'stable');
      if (replacementIndex < 0) break;
      chosen.splice(replacementIndex, 1, stableLeg);
      if (chosen.filter((leg) => leg.riskTag === 'stable').length >= options.minStable) break;
    }
  }

  if (options.minGames > 1) {
    const games = new Set(chosen.map((leg) => leg.gameId));
    if (games.size < options.minGames) {
      const candidates = ranked.filter((leg) => !games.has(leg.gameId));
      if (candidates[0] && chosen.length > 0) chosen[chosen.length - 1] = candidates[0];
    }
  }

  return chosen.slice(0, legCount);
}

export function generateSuggestedSlips(board: BoardProp[], slate: SlateSummary): SuggestedSlip[] {
  const reactive = slate.volatilityFlags.includes('Live window active');
  const safeBoard = board.length > 0 ? board : [];
  const reactiveVarianceDelta = reactive ? 1 : 0;

  const stableLegs = chooseLegs(rankBoard(safeBoard, 'stable', reactive), 3, {
    minStable: 2,
    maxHighVariance: 1,
    uniquePlayers: true,
    minGames: 1
  });

  const balancedLegs = chooseLegs(rankBoard(safeBoard, 'balanced', reactive), 4, {
    minStable: 2,
    maxHighVariance: Math.max(1, 2 - reactiveVarianceDelta),
    uniquePlayers: false,
    minGames: 1
  });

  const ceilingLegs = chooseLegs(rankBoard(safeBoard, 'ceiling', reactive), 5, {
    minStable: 1,
    maxHighVariance: Math.max(1, 2 - reactiveVarianceDelta),
    uniquePlayers: false,
    minGames: 2
  });

  return [
    buildSlip('stable', stableLegs, reactive),
    buildSlip('balanced', balancedLegs, reactive),
    buildSlip('ceiling', ceilingLegs, reactive)
  ];
}
