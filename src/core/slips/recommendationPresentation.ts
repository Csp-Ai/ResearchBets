import type { SlipVerdictDecision } from '@/src/core/slips/slipRiskSummary';

export function presentRecommendation(rec: SlipVerdictDecision): 'TAKE' | 'MODIFY' | 'PASS' {
  if (rec === 'KEEP') return 'TAKE';
  return rec;
}
