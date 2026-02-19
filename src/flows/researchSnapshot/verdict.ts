import type { LiveLegResearch } from '../../agents/live/types';

export const scoreLiveLegVerdict = (leg: LiveLegResearch): LiveLegResearch['verdict'] => {
  const baseline = leg.hitProfile.hitProfile.seasonAvg;
  const l5Score = leg.hitProfile.hitProfile.l5 * 2;
  const l10Score = leg.hitProfile.hitProfile.l10 * 1.4;
  const baselineAdj = baseline * 0.8;
  const divergencePenalty = leg.lineContext.divergence.warning ? 8 : leg.lineContext.divergence.spread * 2;
  const injuryPenalty = leg.injury.severity === 'high' ? 12 : leg.injury.severity === 'medium' ? 6 : 2;
  const score = Math.max(0, Math.min(100, Number((l5Score + l10Score + baselineAdj - divergencePenalty - injuryPenalty).toFixed(1))));

  return {
    score,
    label: score >= 68 ? 'Strong' : score >= 52 ? 'Lean' : 'Pass',
    riskTag: divergencePenalty >= 8 ? 'High' : divergencePenalty >= 3 ? 'Medium' : 'Low'
  };
};
