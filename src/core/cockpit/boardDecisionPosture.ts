import { confidenceTierFromPct, normalizeRateLike } from '@/src/core/decision/lifecycleDecision';

export type BoardDecisionLeg = {
  confidencePct?: number;
  hitRateL10?: number | null;
  edgeDelta?: number;
  riskTag?: 'danger' | 'watch' | 'stable';
  deadLegRisk?: 'low' | 'med' | 'high';
  deadLegReasons?: string[];
  roleConfidence?: 'high' | 'med' | 'low';
  roleReasons?: string[];
  rationale?: string[];
  market?: string;
};

export type BoardDecisionContext = {
  hasSameGameLegInDraft: boolean;
  hasSamePlayerLegInDraft: boolean;
};

export type BoardDecisionSurface = {
  tone: 'strong' | 'solid' | 'thin' | 'fragile';
  strengthLabel: string;
  posture: string;
  breakRiskHint: string;
  ticketContext: string;
  couplingHints: string[];
};

const hasCue = (leg: BoardDecisionLeg, cues: string[]) => {
  const text = [
    ...(leg.deadLegReasons ?? []),
    ...(leg.roleReasons ?? []),
    ...(leg.rationale ?? [])
  ]
    .join(' ')
    .toLowerCase();
  return cues.some((cue) => text.includes(cue));
};

function deriveTone(leg: BoardDecisionLeg): BoardDecisionSurface['tone'] {
  if (leg.deadLegRisk === 'high') return 'fragile';
  if (typeof leg.confidencePct === 'number') {
    const tier = confidenceTierFromPct(leg.confidencePct);
    return tier === 'Strong' ? 'strong' : tier === 'Solid' ? 'solid' : 'thin';
  }
  if (typeof leg.hitRateL10 === 'number') {
    const hitRatePct = normalizeRateLike(leg.hitRateL10, 55).pct;
    const tier = confidenceTierFromPct(hitRatePct);
    return tier === 'Strong' ? 'strong' : tier === 'Solid' ? 'solid' : 'thin';
  }
  return leg.deadLegRisk === 'med' ? 'thin' : 'solid';
}

function derivePosture(
  tone: BoardDecisionSurface['tone'],
  leg: BoardDecisionLeg,
  context: BoardDecisionContext
) {
  if (context.hasSamePlayerLegInDraft) return 'Role overlap watch';
  if (context.hasSameGameLegInDraft && leg.deadLegRisk !== 'low') return 'Watch stack pressure';
  if (tone === 'fragile' && leg.riskTag === 'watch') return 'Volatility-driven leg';
  if (tone === 'fragile') return 'Playable but fragile';
  if (tone === 'thin' && leg.roleConfidence === 'high') return 'Minutes stable, edge thin';
  if (tone === 'thin') return 'Thin edge, stable role';
  if (leg.riskTag === 'watch') return 'Good solo angle, risky in clusters';
  return 'Playable setup';
}

function deriveBreakRiskHint(leg: BoardDecisionLeg) {
  if (hasCue(leg, ['minutes', 'rotation'])) return 'Sensitive to minutes volatility';
  if (hasCue(leg, ['pace', 'tempo'])) return 'Pace-dependent outcome';
  if (hasCue(leg, ['script', 'game environment'])) return 'Script-sensitive leg';
  if (hasCue(leg, ['volume', 'attempt', 'usage'])) return 'Fragile if volume dips';
  if (leg.deadLegRisk === 'high') return 'Common pressure point in stacks';
  if (leg.riskTag === 'watch') return 'Holds better as a solo leg';
  return 'Break risk rises when stacked too tightly';
}

function deriveCouplingHints(leg: BoardDecisionLeg, context: BoardDecisionContext) {
  const hints = new Set<string>();

  if (context.hasSameGameLegInDraft) hints.add('Same-game coupling risk');
  if (context.hasSamePlayerLegInDraft) hints.add('Role overlap watch');
  if (hasCue(leg, ['pace', 'tempo'])) hints.add('Shared pace dependency');
  if (leg.deadLegRisk === 'med' || leg.deadLegRisk === 'high') hints.add('Correlation watch');

  return [...hints].slice(0, 2);
}

function strengthLabel(tone: BoardDecisionSurface['tone']) {
  if (tone === 'strong') return 'Strong setup';
  if (tone === 'solid') return 'Playable edge';
  if (tone === 'thin') return 'Thin edge';
  return 'Fragility pressure';
}

function ticketContext(tone: BoardDecisionSurface['tone'], context: BoardDecisionContext, leg: BoardDecisionLeg) {
  if (context.hasSameGameLegInDraft) return 'Stack-sensitive';
  if (context.hasSamePlayerLegInDraft) return 'Player overlap';
  if (leg.deadLegRisk === 'high') return 'Weakest-leg candidate';
  if (leg.deadLegRisk === 'med') return 'Script-sensitive';
  if (tone === 'strong') return 'Anchor candidate';
  return 'Balanced leg';
}

export function deriveBoardDecisionSurface(
  leg: BoardDecisionLeg,
  context: BoardDecisionContext
): BoardDecisionSurface {
  const tone = deriveTone(leg);
  return {
    tone,
    strengthLabel: strengthLabel(tone),
    posture: derivePosture(tone, leg, context),
    breakRiskHint: deriveBreakRiskHint(leg),
    ticketContext: ticketContext(tone, context, leg),
    couplingHints: deriveCouplingHints(leg, context)
  };
}
