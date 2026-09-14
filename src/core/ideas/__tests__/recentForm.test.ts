import { describe, expect, it } from 'vitest';

import { computeRecentThresholdForm, nflMarketValue } from '@/src/core/ideas/recentForm';

describe('recentForm', () => {
  it('maps NFL markets to the correct stat instead of NBA points', () => {
    const log = {
      gameDate: '2026-09-01T00:00:00.000Z',
      passingYards: 245,
      rushingYards: 31,
      receivingYards: 88,
      receptions: 7,
      carries: 14,
      passingTouchdowns: 2,
      anytimeTouchdowns: 1,
    };

    expect(nflMarketValue(log, 'passing_yards')).toBe(245);
    expect(nflMarketValue(log, 'receiving_yards')).toBe(88);
    expect(nflMarketValue(log, 'receptions')).toBe(7);
    expect(nflMarketValue(log, 'carries')).toBe(14);
    expect(nflMarketValue(log, 'anytime_td')).toBe(1);
  });

  it('computes actual L5/L10 hit rates against the ticket threshold', () => {
    const values = [92, 43, 56, 83, 27, 71, 64, 88, 35, 61];
    const logs = values.map((receivingYards, index) => ({
      gameDate: new Date(Date.UTC(2026, 8, 10 - index)).toISOString(),
      receivingYards,
    }));

    const form = computeRecentThresholdForm({
      logs,
      marketType: 'receiving_yards',
      threshold: 60,
      season: '2026',
      asOf: '2026-09-13T00:00:00.000Z',
    });

    expect(form).not.toBeNull();
    expect(form?.l5Hits).toBe(2);
    expect(form?.l5Games).toBe(5);
    expect(form?.l5HitRate).toBe(0.4);
    expect(form?.l10Hits).toBe(6);
    expect(form?.l10HitRate).toBe(0.6);
    expect(form?.recentAverage).toBe(62);
  });

  it('does not manufacture form when the market stat is absent', () => {
    const form = computeRecentThresholdForm({
      logs: [{ gameDate: '2026-09-01T00:00:00.000Z', passingYards: 250 }],
      marketType: 'receiving_yards',
      threshold: 50,
      season: '2026',
      asOf: '2026-09-13T00:00:00.000Z',
    });

    expect(form).toBeNull();
  });
});
