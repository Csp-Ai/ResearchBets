import { describe, expect, it } from 'vitest';

import { buildSlipStructureReport } from '@/src/core/slips/slipIntelligence';

describe('buildSlipStructureReport', () => {
  it('builds canonical report with deterministic legs and forecast', () => {
    const report = buildSlipStructureReport([
      { selection: 'Luka Doncic over 31.5 points', player: 'Luka Doncic', game: 'LAL @ DAL', odds: '+160', line: '31.5', market: 'points' },
      { selection: 'Luka Doncic over 8.5 assists', player: 'Luka Doncic', game: 'LAL @ DAL', odds: '+120', line: '8.5', market: 'assists' },
      { selection: 'LeBron James over 7.5 assists', player: 'LeBron James', game: 'LAL @ DAL', odds: '-110', line: '7.5', market: 'assists' }
    ], { mode: 'cache', reason: 'fallback data', trace_id: 'trace-1', slip_id: 'slip-1' });

    expect(report.mode).toBe('cache');
    expect(report.reason).toBe('fallback data');
    expect(report.legs.length).toBe(3);
    expect(report.legs.every((leg) => Boolean(leg.leg_id))).toBe(true);
    expect(report.weakest_leg_id).toBeTruthy();
    expect(report.failure_forecast.top_reasons.length).toBeGreaterThan(0);
    expect(Array.isArray(report.correlation_edges)).toBe(true);
  });
});
