import { impliedProbabilitiesFromLines, moneylineToProbability } from '@/src/core/markets/impliedProbabilities';

export type OddsInput = number | string | null | undefined;

export type EdgeDeriveInput = {
  idSeed: string;
  hitRateL10?: number;
  hitRateL5?: number;
  riskTag?: 'stable' | 'watch';
};

export function oddsToImpliedProbability(odds: OddsInput): number | null {
  if (odds == null) return null;
  if (typeof odds === 'number') {
    if (odds <= 1 || !Number.isFinite(odds)) return moneylineToProbability(odds);
    return Number((1 / odds).toFixed(4));
  }

  const value = odds.trim();
  if (!value) return null;

  if (value.startsWith('+') || value.startsWith('-')) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return moneylineToProbability(parsed);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed > 1) return Number((1 / parsed).toFixed(4));
  return moneylineToProbability(parsed);
}

export function computeMarketImpliedProb(input: { odds?: OddsInput; homeMoneyline?: number | null; awayMoneyline?: number | null }): number {
  if (input.homeMoneyline != null && input.awayMoneyline != null) {
    return impliedProbabilitiesFromLines({
      homeMoneyline: input.homeMoneyline,
      awayMoneyline: input.awayMoneyline,
      removeVig: true
    }).home.implied;
  }

  return oddsToImpliedProbability(input.odds) ?? 0.5;
}

const hashSeed = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export function deriveDeterministicModelProb(input: EdgeDeriveInput): number {
  const base = (input.hitRateL10 ?? 54) / 100;
  const l5Boost = input.hitRateL5 != null ? ((input.hitRateL5 - (input.hitRateL10 ?? input.hitRateL5)) / 250) : 0;
  const riskAdjust = input.riskTag === 'watch' ? -0.015 : 0.012;
  const seededNudge = ((hashSeed(input.idSeed) % 9) - 4) / 1000;
  return Number(Math.min(0.92, Math.max(0.08, base + l5Boost + riskAdjust + seededNudge)).toFixed(4));
}

export function computeModelProb(input: { modelProb?: number | null; deterministic?: EdgeDeriveInput }): number {
  if (typeof input.modelProb === 'number' && Number.isFinite(input.modelProb)) {
    return Math.min(0.999, Math.max(0.001, Number(input.modelProb.toFixed(4))));
  }
  if (input.deterministic) return deriveDeterministicModelProb(input.deterministic);
  return 0.5;
}

export function computeEdgeDelta(modelProb: number, marketProb: number): number {
  return Number((modelProb - marketProb).toFixed(4));
}

export function formatPct(value: number, precision = 1): string {
  return `${(value * 100).toFixed(precision)}%`;
}

export function formatSignedPct(value: number, precision = 1): string {
  const pct = (value * 100).toFixed(precision);
  return `${value >= 0 ? '+' : ''}${pct}%`;
}
