import type { ExtractedLeg } from '@/src/core/run/types';

export async function enrichInjuries(leg: ExtractedLeg): Promise<{ injury: string | null; news: string | null; source: 'live' | 'fallback'; notes: string[] }> {
  void leg;

  return {
    injury: null,
    news: null,
    source: 'fallback',
    notes: ['Injury/news provider unavailable in this environment.']
  };
}
