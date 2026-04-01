import { describe, expect, it } from 'vitest';

import { deriveBoardDecisionSurface } from '@/src/core/cockpit/boardDecisionPosture';

describe('deriveBoardDecisionSurface', () => {
  it('flags fragile stacked legs with pre-slip coupling hints', () => {
    const result = deriveBoardDecisionSurface(
      {
        confidencePct: 61,
        deadLegRisk: 'high',
        riskTag: 'watch',
        deadLegReasons: ['Minutes can slide in volatile rotation spots']
      },
      { hasSameGameLegInDraft: true, hasSamePlayerLegInDraft: false }
    );

    expect(result.posture).toBe('Watch stack pressure');
    expect(result.breakRiskHint).toBe('Sensitive to minutes volatility');
    expect(result.couplingHints).toContain('Same-game coupling risk');
    expect(result.tone).toBe('fragile');
  });

  it('keeps stable solo legs actionable without overclaiming', () => {
    const result = deriveBoardDecisionSurface(
      {
        confidencePct: 71,
        deadLegRisk: 'low',
        riskTag: 'stable',
        rationale: ['Role is stable and matchup creates clean looks']
      },
      { hasSameGameLegInDraft: false, hasSamePlayerLegInDraft: false }
    );

    expect(result.strengthLabel).toBe('Strong setup');
    expect(result.posture).toBe('Playable setup');
    expect(result.breakRiskHint).toBe('Break risk rises when stacked too tightly');
    expect(result.couplingHints).toEqual([]);
  });
});
