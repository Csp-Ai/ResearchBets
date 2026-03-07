import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';

export const SCOUT_ANALYZE_PREFILL_STORAGE_KEY = 'rb:research:scout-prefill';
export const SCOUT_ANALYZE_CONTEXT_STORAGE_KEY = 'rb:research:scout-context';

export function serializeDraftSlip(legs: SlipBuilderLeg[]): string {
  return legs
    .map((leg) => {
      const parts = [`${leg.player} ${leg.marketType} ${leg.line}`.trim()];
      if (leg.odds) parts.push(`(${leg.odds})`);
      return parts.join(' ').replace(/\s+/g, ' ').trim();
    })
    .filter(Boolean)
    .join('\n');
}

export function serializeDraftContext(entries: string[]): string {
  return entries.map((entry) => entry.trim()).filter(Boolean).slice(0, 3).join('\n');
}
