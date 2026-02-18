export interface ImpliedSideProbability {
  implied: number;
  degraded: boolean;
}

export interface ImpliedProbabilityPair {
  home: ImpliedSideProbability;
  away: ImpliedSideProbability;
  source: 'moneyline' | 'fallback';
}

const toDecimal = (value: number): number => Number(value.toFixed(4));

export function moneylineToProbability(moneyline: number): number {
  if (moneyline === 0 || !Number.isFinite(moneyline)) return 0.5;
  if (moneyline > 0) return toDecimal(100 / (moneyline + 100));
  return toDecimal(Math.abs(moneyline) / (Math.abs(moneyline) + 100));
}

export function impliedProbabilitiesFromLines(input: {
  homeMoneyline?: number | null;
  awayMoneyline?: number | null;
  removeVig?: boolean;
}): ImpliedProbabilityPair {
  const homeMoneyline = input.homeMoneyline ?? null;
  const awayMoneyline = input.awayMoneyline ?? null;

  if (homeMoneyline == null || awayMoneyline == null) {
    return {
      home: { implied: 0.5, degraded: true },
      away: { implied: 0.5, degraded: true },
      source: 'fallback'
    };
  }

  const rawHome = moneylineToProbability(homeMoneyline);
  const rawAway = moneylineToProbability(awayMoneyline);

  if (!input.removeVig) {
    return {
      home: { implied: rawHome, degraded: false },
      away: { implied: rawAway, degraded: false },
      source: 'moneyline'
    };
  }

  const total = rawHome + rawAway;
  if (total <= 0) {
    return {
      home: { implied: 0.5, degraded: true },
      away: { implied: 0.5, degraded: true },
      source: 'fallback'
    };
  }

  return {
    home: { implied: toDecimal(rawHome / total), degraded: false },
    away: { implied: toDecimal(rawAway / total), degraded: false },
    source: 'moneyline'
  };
}
