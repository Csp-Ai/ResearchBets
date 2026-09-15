import { describe, expect, it } from 'vitest';

import { optimizeThreshold } from '@/src/core/slips/thresholdOptimizer';

describe('threshold optimizer', () => {
  it('steps down a pushed leg when the lower tier meaningfully improves survival', () => {
    const result = optimizeThreshold({
      currentLine: 80,
      currentProbability: 0.64,
      currentTier: 'pushed',
      recentFormStatus: 'mixed',
      allowEscalation: false,
      lower: {
        line: 70,
        bestPrice: '-290',
        consensusPrice: '-275',
        marketImpliedProb: 0.74,
        sourceCount: 4,
      },
    });

    expect(result.decision).toBe('step_down');
    expect(result.stepDown?.lineDelta).toBe(10);
    expect(result.stepDown?.probabilityDelta).toBeCloseTo(0.10);
  });

  it('allows a selective step up when the probability cost is small and push budget is open', () => {
    const result = optimizeThreshold({
      currentLine: 10,
      currentProbability: 0.79,
      currentTier: 'floor',
      recentFormStatus: 'support',
      allowEscalation: true,
      higher: {
        line: 15,
        bestPrice: '-300',
        consensusPrice: '-285',
        marketImpliedProb: 0.73,
        sourceCount: 3,
      },
    });

    expect(result.decision).toBe('step_up');
    expect(result.stepUp?.lineDelta).toBe(5);
    expect(result.stepUp?.probabilityDelta).toBeCloseTo(0.06);
  });

  it('holds when an escalation costs too much probability', () => {
    const result = optimizeThreshold({
      currentLine: 70,
      currentProbability: 0.74,
      currentTier: 'floor',
      recentFormStatus: 'support',
      allowEscalation: true,
      higher: {
        line: 80,
        bestPrice: '-180',
        consensusPrice: '-175',
        marketImpliedProb: 0.64,
        sourceCount: 5,
      },
    });

    expect(result.decision).toBe('hold');
    expect(result.reason).toMatch(/costs 10 probability points/i);
  });

  it('does not escalate a leg with recent-form tension', () => {
    const result = optimizeThreshold({
      currentLine: 40,
      currentProbability: 0.78,
      currentTier: 'floor',
      recentFormStatus: 'tension',
      allowEscalation: true,
      higher: {
        line: 50,
        bestPrice: '-270',
        consensusPrice: '-260',
        marketImpliedProb: 0.72,
        sourceCount: 4,
      },
    });

    expect(result.decision).toBe('hold');
  });

  it('holds rather than inventing a move when no verified adjacent higher tier exists', () => {
    const result = optimizeThreshold({
      currentLine: 4,
      currentProbability: 0.76,
      currentTier: 'floor',
      recentFormStatus: 'support',
      allowEscalation: true,
    });

    expect(result.decision).toBe('hold');
    expect(result.stepUp).toBeNull();
    expect(result.reason).toMatch(/no verified adjacent higher tier/i);
  });
});
