import { describe, expect, it } from 'vitest';

import { getConfidenceCopy, getTruthModeCopy } from '@/src/core/ui/truthPresentation';

describe('truthPresentation helpers', () => {
  it('returns neutral truthful copy for cache fallback', () => {
    const truth = getTruthModeCopy({ mode: 'cache', intentMode: 'live' });
    expect(truth.label).toBe('Cache fallback');
    expect(truth.intentHint).toContain('Requested live');
  });

  it('caps confidence messaging when source quality is fallback-heavy', () => {
    const confidence = getConfidenceCopy({ confidencePct: 91, sourceQuality: 'fallback' });
    expect(confidence.boundedPct).toBe(65);
    expect(confidence.label).toContain('fallback-limited');
  });
});
