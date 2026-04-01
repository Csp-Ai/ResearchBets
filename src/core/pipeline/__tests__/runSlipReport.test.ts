import { describe, expect, it } from 'vitest';

import { computeVerdict } from '@/src/core/pipeline/runSlip';
import { buildSlipStructureReport } from '@/src/core/slips/slipIntelligence';

describe('runSlip report mapping contracts', () => {
  it('keeps verdict weakest leg and report weakest leg compatible', () => {
    const extracted = [
      { id: 'a', selection: 'Leg A', market: 'points', odds: '+160', line: '31.5', player: 'A', team: 'X' },
      { id: 'b', selection: 'Leg B', market: 'assists', odds: '-110', line: '7.5', player: 'B', team: 'Y' }
    ];
    const enriched = [
      { extractedLegId: 'a', l5: 40, l10: 45, season: 44, vsOpp: 42, flags: { injury: null, news: null, lineMove: null, divergence: null }, evidenceNotes: [] },
      { extractedLegId: 'b', l5: 85, l10: 88, season: 80, vsOpp: 78, flags: { injury: null, news: null, lineMove: null, divergence: null }, evidenceNotes: [] }
    ];

    const verdict = computeVerdict(enriched, extracted, { stats: 'fallback', injuries: 'fallback', odds: 'fallback' });
    const report = buildSlipStructureReport(extracted.map((leg) => ({
      leg_id: leg.id,
      market: leg.market ?? 'market',
      player: leg.player,
      team: leg.team,
      line: Number(leg.line),
      odds: leg.odds,
      notes: leg.selection
    })), {
      risk_band:
        verdict.riskLabel === 'Strong' || verdict.riskLabel === 'Solid'
          ? 'low'
          : verdict.riskLabel === 'Thin'
            ? 'med'
            : 'high',
      confidence_band:
        verdict.riskLabel === 'Strong' ? 'high' : verdict.riskLabel === 'Solid' ? 'med' : 'low',
      mode: 'cache'
    });

    expect(verdict.weakestLegId).toBe('a');
    expect(report.legs.length).toBe(2);
    expect(report.confidence_band).toBeTruthy();
    expect(report.risk_band).toBeTruthy();
  });
});
