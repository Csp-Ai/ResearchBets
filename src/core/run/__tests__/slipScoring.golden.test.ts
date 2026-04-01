import { describe, expect, it } from 'vitest';

import { computeVerdict } from '@/src/core/pipeline/runSlip';
import type { EnrichedLeg, ExtractedLeg, SourceStats } from '@/src/core/run/types';

describe('computeVerdict golden semantics', () => {
  it('keeps deterministic weakest leg and reason ordering stable', () => {
    const extracted: ExtractedLeg[] = [
      { id: 'l1', selection: 'Player A over 30.5 points' },
      { id: 'l2', selection: 'Player B over 8.5 rebounds' },
      { id: 'l3', selection: 'Player C over 6.5 assists' }
    ];

    const enriched: EnrichedLeg[] = [
      { extractedLegId: 'l1', l5: 45, l10: 51, season: 52, vsOpp: 50, flags: { injury: null, news: 'questionable report', lineMove: 1.2, divergence: 0.7 }, evidenceNotes: [] },
      { extractedLegId: 'l2', l5: 59, l10: 61, season: 62, vsOpp: 58, flags: { injury: null, news: null, lineMove: 0.2, divergence: 0.1 }, evidenceNotes: [] },
      { extractedLegId: 'l3', l5: 73, l10: 75, season: 70, vsOpp: 71, flags: { injury: null, news: null, lineMove: null, divergence: null }, evidenceNotes: [] }
    ];

    const sources: SourceStats = { stats: 'fallback', injuries: 'fallback', odds: 'fallback' };

    const verdict = computeVerdict(enriched, extracted, sources);

    expect(verdict.weakestLegId).toBe('l1');
    expect(verdict.riskLabel).toBe('Solid');
    expect(verdict.confidencePct).toBe(65);
    expect(verdict.reasons[0]).toContain('Highest downside: Player A over 30.5 points');
    expect(verdict.reasons[1]).toContain('Next highest downside: Player B over 8.5 rebounds');
    expect(verdict.reasons[2]).toContain('Downside #3: Player C over 6.5 assists');
  });
});
