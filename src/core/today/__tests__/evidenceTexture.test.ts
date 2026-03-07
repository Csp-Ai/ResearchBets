import { describe, expect, it } from 'vitest';

import { deriveEvidenceTexture } from '@/src/core/today/evidenceTexture';

describe('deriveEvidenceTexture', () => {
  it('surfaces focused support categories and strongest evidence from current row signals', () => {
    const texture = deriveEvidenceTexture({
      market: 'threes',
      line: '2.5',
      edgeDelta: 0.09,
      hitRateL10: 70,
      threesAttL5Avg: 7.1,
      minutesL3Avg: 34.2,
      roleConfidence: 'high',
      rationale: ['Matchup keeps perimeter volume live'],
    });

    expect(texture.supportTags).toEqual(['volume-driven', 'role-driven']);
    expect(texture.strongestEvidence).toMatch(/Shot volume supports look/i);
  });

  it('maps deterministic fragility cues into bettor-native caution language', () => {
    const texture = deriveEvidenceTexture({
      market: 'points',
      riskTag: 'watch',
      roleConfidence: 'low',
      deadLegRisk: 'high',
      deadLegReasons: ['Low minutes (L3)', 'Role volatility'],
    });

    expect(texture.caution).toBe('role sensitive');
  });

  it('omits caution when no meaningful risk signal is present', () => {
    const texture = deriveEvidenceTexture({
      market: 'assists',
      edgeDelta: 0.04,
      riskTag: 'stable',
      roleConfidence: 'high',
      deadLegRisk: 'low',
      deadLegReasons: [],
    });

    expect(texture.caution).toBeUndefined();
  });
});
