import { describe, expect, it } from 'vitest';

import { deterministicPropReasoning } from '../propReasoning';

describe('deterministicPropReasoning', () => {
  it('returns positive narrative when l10 and edge are positive', () => {
    const result = deterministicPropReasoning({ player: 'Luka', market: 'points', l10: 0.71, edgeDelta: 0.06, volatility: 'low' });
    expect(result).toContain('positive model edge');
  });

  it('returns caution narrative when volatility is high', () => {
    const result = deterministicPropReasoning({ player: 'AD', market: 'rebounds', l10: 0.74, edgeDelta: 0.08, volatility: 'high' });
    expect(result).toContain('high-volatility');
  });
});
