export function americanToDecimal(american: number): number {
  if (!Number.isFinite(american) || american === 0) return 1;
  return american > 0 ? 1 + (american / 100) : 1 + (100 / Math.abs(american));
}

export function impliedProbFromAmerican(american: number): number {
  if (!Number.isFinite(american) || american === 0) return 0;
  return american > 0 ? 100 / (american + 100) : Math.abs(american) / (Math.abs(american) + 100);
}

export function breakEvenProbFromDecimal(decimalOdds: number): number {
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 1) return 0;
  return 1 / decimalOdds;
}

export function parlayProbIndependent(probabilities: number[]): number {
  return probabilities.reduce((acc, p) => {
    const safe = Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 0;
    return acc * safe;
  }, 1);
}

export function payoutFromAmerican(stake: number, american: number): { profit: number; totalReturn: number } {
  const safeStake = Number.isFinite(stake) && stake > 0 ? stake : 0;
  const decimal = americanToDecimal(american);
  const totalReturn = safeStake * decimal;
  return { profit: Math.max(0, totalReturn - safeStake), totalReturn };
}
