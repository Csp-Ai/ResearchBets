import type { SlipIntelLeg } from '@/src/core/slips/slipIntelligence';
import { buildSlipStructureReport } from '@/src/core/slips/slipIntelligence';

export type SlipVerdictDecision = 'TAKE' | 'MODIFY' | 'PASS';

export type SlipRiskSummary = {
  weakestLeg: string;
  fragilityScore: number;
  correlationFlag: boolean;
  correlationReason: string;
  volatilitySummary: string;
  dominantRiskFactor: string;
  recommendation: SlipVerdictDecision;
  confidencePct: number;
  riskLabel: 'Low' | 'Medium' | 'High';
  highVolatilityLegs: number;
  reasonBullets: string[];
  legVolatilityTags: Array<{ legId: string; label: string; volatility: 'Low' | 'Medium' | 'High' }>;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const title = (value?: string) => (value && value.trim().length > 0 ? value : 'Unlabeled leg');

const volatilityLabel = (volatility?: 'low' | 'med' | 'high') => {
  if (volatility === 'high') return 'High' as const;
  if (volatility === 'med') return 'Medium' as const;
  return 'Low' as const;
};

export function deriveSlipRiskSummary(legs: SlipIntelLeg[]): SlipRiskSummary {
  const report = buildSlipStructureReport(legs, { mode: 'demo' });
  const weakest = report.legs.find((leg) => leg.leg_id === report.weakest_leg_id) ?? report.legs[0];
  const fragilityScore = report.legs.length === 0
    ? 0
    : clamp(report.legs.reduce((sum, leg) => sum + (leg.fragility_score ?? 0), 0) / report.legs.length);

  const sameTeamEdge = report.correlation_edges.find((edge) => edge.kind === 'same_team');
  const marketCounts = new Map<string, number>();
  for (const leg of report.legs) {
    const key = leg.market?.toLowerCase() ?? 'market';
    marketCounts.set(key, (marketCounts.get(key) ?? 0) + 1);
  }
  const sameStatType = [...marketCounts.entries()].find(([, count]) => count >= 2);
  const correlationFlag = Boolean(sameTeamEdge || sameStatType);
  const correlationReason = sameTeamEdge
    ? 'Same-team stacking detected.'
    : sameStatType
      ? `${sameStatType[1]} legs stack the ${sameStatType[0]} market.`
      : 'No major correlation clusters detected.';

  const legVolatilityTags = report.legs.map((leg) => ({
    legId: leg.leg_id,
    label: title(leg.notes ?? leg.player),
    volatility: volatilityLabel(leg.volatility)
  }));

  const highVolatilityLegs = legVolatilityTags.filter((leg) => leg.volatility === 'High').length;
  const volatilitySummary = `${highVolatilityLegs}/${report.legs.length} high-vol legs`;

  const passRecommended = fragilityScore > 62 || correlationFlag || highVolatilityLegs >= 2;
  const recommendation: SlipVerdictDecision = passRecommended ? 'PASS' : fragilityScore >= 45 ? 'MODIFY' : 'TAKE';
  const dominantRiskFactor = fragilityScore > 62
    ? 'Fragility score is above safe threshold.'
    : correlationFlag
      ? correlationReason
      : highVolatilityLegs >= 2
        ? 'Multiple high-volatility legs are stacked.'
        : 'Leg concentration is balanced.';

  const confidencePct = clamp(100 - fragilityScore);
  const riskLabel = fragilityScore >= 65 ? 'High' : fragilityScore >= 40 ? 'Medium' : 'Low';

  const reasonBullets = [
    dominantRiskFactor,
    `Weakest leg: ${title(weakest?.notes ?? weakest?.player)}.`,
    `Correlation check: ${correlationReason}`
  ].slice(0, 3);

  return {
    weakestLeg: title(weakest?.notes ?? weakest?.player),
    fragilityScore,
    correlationFlag,
    correlationReason,
    volatilitySummary,
    dominantRiskFactor,
    recommendation,
    confidencePct,
    riskLabel,
    highVolatilityLegs,
    reasonBullets,
    legVolatilityTags
  };
}
