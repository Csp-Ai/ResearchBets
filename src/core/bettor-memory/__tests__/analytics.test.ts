import { describe, expect, it } from 'vitest';

import { buildDemoBettorMemory } from '../demo';
import { buildStoredPostmortems, classifyBettorIdentity, computeActivityHeatmap, computeMarketPerformance, computePerformanceSummary, computeSlipSizePerformance, computeWeeklyRollups, generateAdvisorySignals, generatePostmortemTags, summarizeCredibility } from '../analytics';

const snapshot = buildDemoBettorMemory();

describe('bettor memory analytics', () => {
  it('computes summary metrics', () => {
    expect(computePerformanceSummary(snapshot.slips)).toMatchObject({ netResult: -2.5, totalStaked: 65, totalReturned: 62.5, betCount: 2, winCount: 1, winRatePct: 50 });
  });

  it('builds weekly rollups and heatmap buckets', () => {
    expect(computeWeeklyRollups(snapshot.slips)).toHaveLength(2);
    expect(computeActivityHeatmap(snapshot.slips).map((row) => row.day)).toEqual(['2026-03-01', '2026-03-05']);
  });

  it('aggregates categories and slip sizes safely', () => {
    expect(computeMarketPerformance(snapshot.slips)[0]?.label).toBe('3PM');
    expect(computeSlipSizePerformance(snapshot.slips).map((row) => row.label)).toEqual(['2-leg', '4-leg']);
  });

  it('classifies bettor identity and advisory signals deterministically', () => {
    expect(classifyBettorIdentity(snapshot.slips)).toBe('ladder_hunter');
    expect(generateAdvisorySignals(snapshot.slips).map((item) => item.label)).toContain('Longshot parlay concentration');
  });

  it('builds postmortem tags and credibility labels', () => {
    expect(generatePostmortemTags(snapshot.slips[1]!, snapshot.slips)).toContain('correlated_same_game');
    expect(buildStoredPostmortems(snapshot.slips)).toHaveLength(2);
    expect(summarizeCredibility(snapshot).basis).toBe('demo_data');
  });
});
