import type { MarketType } from '@/src/core/markets/marketType';

export type EvidenceCategory =
  | 'volume-driven'
  | 'role-driven'
  | 'matchup-driven'
  | 'trend-driven'
  | 'price-driven';

export type EvidenceTextureInput = {
  market: MarketType;
  line?: string;
  odds?: string;
  hitRateL10?: number;
  edgeDelta?: number;
  modelProb?: number;
  marketImpliedProb?: number;
  riskTag?: 'stable' | 'watch';
  l5Avg?: number;
  threesAttL5Avg?: number;
  minutesL3Avg?: number;
  roleConfidence?: 'high' | 'med' | 'low';
  deadLegRisk?: 'low' | 'med' | 'high';
  deadLegReasons?: string[];
  rationale?: string[];
};

export type EvidenceTexture = {
  supportTags: EvidenceCategory[];
  strongestEvidence?: string;
  caution?: string;
  supportStrength: 'strong' | 'balanced' | 'thin';
};

type Candidate = { tag: EvidenceCategory; reason: string; weight: number };

const toNumericLine = (line?: string): number | undefined => {
  if (typeof line !== 'string' || !line.trim()) return undefined;
  const parsed = Number(line);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const formatOneDecimal = (value: number) => value.toFixed(1).replace(/\.0$/, '');

function deriveSupportCandidates(input: EvidenceTextureInput): Candidate[] {
  const candidates: Candidate[] = [];
  const line = toNumericLine(input.line);
  const rationaleText = (input.rationale ?? []).join(' ').toLowerCase();

  if (typeof input.edgeDelta === 'number' && input.edgeDelta >= 0.06) {
    candidates.push({
      tag: 'price-driven',
      reason: `Price edge ${Math.round(input.edgeDelta * 100)}% over market baseline.`,
      weight: input.edgeDelta + 0.05,
    });
  }

  if (input.market === 'threes' && typeof input.threesAttL5Avg === 'number' && input.threesAttL5Avg >= 6) {
    candidates.push({
      tag: 'volume-driven',
      reason: `Shot volume supports look (3PA L5 ${formatOneDecimal(input.threesAttL5Avg)}).`,
      weight: 0.82,
    });
  } else if (typeof input.l5Avg === 'number' && typeof line === 'number' && input.l5Avg - line >= 2) {
    candidates.push({
      tag: 'volume-driven',
      reason: `Recent output sits above line (L5 ${formatOneDecimal(input.l5Avg)} vs ${formatOneDecimal(line)}).`,
      weight: 0.7 + Math.min((input.l5Avg - line) / 10, 0.15),
    });
  }

  if (input.roleConfidence === 'high' && typeof input.minutesL3Avg === 'number' && input.minutesL3Avg >= 30) {
    candidates.push({
      tag: 'role-driven',
      reason: `Role/rotation base is steady (MIN L3 ${formatOneDecimal(input.minutesL3Avg)}).`,
      weight: 0.78,
    });
  }

  if (typeof input.hitRateL10 === 'number' && input.hitRateL10 >= 65) {
    candidates.push({
      tag: 'trend-driven',
      reason: `Recent trend is supportive (L10 hit rate ${Math.round(input.hitRateL10)}%).`,
      weight: 0.72,
    });
  }

  if (rationaleText.includes('matchup')) {
    candidates.push({
      tag: 'matchup-driven',
      reason: 'Matchup context is part of the board case.',
      weight: 0.66,
    });
  }

  if (candidates.length === 0 && typeof input.edgeDelta === 'number' && input.edgeDelta >= 0.03) {
    candidates.push({
      tag: 'price-driven',
      reason: `Modest price edge (${Math.round(input.edgeDelta * 100)}%) keeps it viable.`,
      weight: 0.55,
    });
  }

  return candidates.sort((a, b) => b.weight - a.weight);
}

function deriveCaution(input: EvidenceTextureInput): string | undefined {
  const reasons = input.deadLegReasons ?? [];

  if (reasons[0]) {
    return reasons[0];
  }

  if (reasons.some((reason) => /low 3pa volume/i.test(reason))) {
    return 'high swing shot volume';
  }
  if (reasons.some((reason) => /low minutes/i.test(reason)) || input.roleConfidence === 'low') {
    return 'role sensitive';
  }
  if (reasons.some((reason) => /role volatility/i.test(reason)) || input.roleConfidence === 'med') {
    return 'rotation can shift quickly';
  }
  if (reasons.some((reason) => /mismatch risk/i.test(reason))) {
    return 'price already tight';
  }
  if (input.deadLegRisk === 'high') {
    return 'fragility elevated';
  }
  if (input.riskTag === 'watch' && input.market === 'threes' && typeof input.threesAttL5Avg === 'number' && input.threesAttL5Avg < 4.5) {
    return 'high swing shot volume';
  }

  return undefined;
}

export function deriveEvidenceTexture(input: EvidenceTextureInput): EvidenceTexture {
  const candidates = deriveSupportCandidates(input);
  const topWeight = candidates[0]?.weight ?? 0;
  const supportStrength: EvidenceTexture['supportStrength'] = topWeight >= 0.8 ? 'strong' : topWeight >= 0.62 ? 'balanced' : 'thin';

  return {
    supportTags: candidates.slice(0, 2).map((candidate) => candidate.tag),
    strongestEvidence: candidates[0]?.reason,
    caution: deriveCaution(input),
    supportStrength,
  };
}
