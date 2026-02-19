import { describe, expect, it } from 'vitest';

import { buildGroupReply } from '@/src/components/bettor/ShareReply';
import type { Run } from '@/src/core/run/types';

const runFixture: Run = {
  traceId: 'trace-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: 'complete',
  slipText: 'sample',
  extractedLegs: [
    { id: 'leg-1', selection: 'Player A over 24.5 points' },
    { id: 'leg-2', selection: 'Player B over 7.5 rebounds' }
  ],
  enrichedLegs: [
    {
      extractedLegId: 'leg-1',
      l5: 40,
      l10: 52,
      riskScore: 30,
      riskBand: 'high',
      flags: { injury: null, news: null, lineMove: null, divergence: null },
      evidenceNotes: []
    },
    {
      extractedLegId: 'leg-2',
      l5: 70,
      l10: 68,
      riskScore: 8,
      riskBand: 'low',
      flags: { injury: null, news: 'rotation volatile', lineMove: 1, divergence: 0.8 },
      evidenceNotes: []
    }
  ],
  analysis: {
    confidencePct: 58,
    weakestLegId: 'leg-1',
    reasons: [],
    riskLabel: 'Caution',
    computedAt: new Date().toISOString()
  },
  sources: { stats: 'live', injuries: 'fallback', odds: 'fallback' },
  metadata: { crowdNotes: '2 contributors suspended' }
};

describe('buildGroupReply', () => {
  it('creates expected group chat sections', () => {
    const reply = buildGroupReply(runFixture);

    expect(reply).toContain('ResearchBets verdict: 58% (Caution)');
    expect(reply).toContain('Weakest leg: Player A over 24.5 points');
    expect(reply).toContain('Suggestion: remove weakest and re-run');
    expect(reply).toContain('Any injuries/suspensions we should know about?');
    expect(reply).toContain('What book/odds did you take? Any line movement?');
    expect(reply).toContain('Data sources: stats=live, injuries=fallback, odds=fallback');
    expect(reply).toContain('Crowd notes (unverified): 2 contributors suspended');
  });
});
