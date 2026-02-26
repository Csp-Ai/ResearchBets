import type { ParsedSlipLeg } from '@/src/core/slips/freeTextParser';

type Verdict = 'KEEP' | 'MODIFY' | 'PASS';

const saferAlternative = (leg: ParsedSlipLeg) => {
  if (leg.marketType?.includes('moneyline')) return `Safer angle: ${leg.teamOrPlayer} + alt spread.`;
  if (leg.line != null) return `Safer angle: ${leg.teamOrPlayer} at a reduced line (${Math.max(leg.line - 1, 0.5)}).`;
  return `Safer angle: use ${leg.teamOrPlayer} in a single-leg look before adding parlays.`;
};

export const buildSharedSlipFeedback = (legs: ParsedSlipLeg[]): { verdict: Verdict; body: string } => {
  if (legs.length === 0) {
    return {
      verdict: 'MODIFY',
      body: 'MODIFY — Could not confidently parse this shared slip. Keep the ticket text, confirm legs, and avoid auto-firing until each leg is clear.'
    };
  }

  const weakest = ([...legs].sort((a, b) => a.confidence - b.confidence)[0] ?? legs[0])!;
  const unknowns = legs.filter((leg) => leg.marketType == null).length;
  const highJuice = legs.filter((leg) => leg.odds != null && leg.odds < -145).length;

  const verdict: Verdict = unknowns > 1 || highJuice > 1 ? 'PASS' : (legs.length >= 4 ? 'MODIFY' : 'KEEP');
  const reasons = [
    `${legs.length} legs create compounding risk.`,
    `${unknowns} leg(s) have unclear market typing.`,
    `${highJuice} leg(s) are expensive prices (< -145), which increase hold pressure.`,
    `Weakest leg signal: ${weakest.teamOrPlayer} (${Math.round(weakest.confidence * 100)}% parse confidence).`
  ].slice(0, 4);

  return {
    verdict,
    body: `${verdict} — ${reasons.join(' ')} ${saferAlternative(weakest)}`
  };
};
