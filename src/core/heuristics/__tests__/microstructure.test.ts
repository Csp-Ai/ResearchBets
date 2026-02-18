import { describe, expect, it } from 'vitest';

import { evaluateHeuristicMicrostructure } from '../microstructure';

describe('evaluateHeuristicMicrostructure', () => {
  it('returns deterministic signal set for balanced pregame snapshot fixture', () => {
    const result = evaluateHeuristicMicrostructure({
      snapshotLoadedAt: '2026-01-10T16:00:00.000Z',
      game: {
        gameId: 'NFL_DEMO_1',
        startsAt: '2026-01-10T16:35:00.000Z',
        degraded: false,
        source: 'DEMO',
        homeTeam: 'Chiefs',
        awayTeam: 'Bills',
        implied: { home: 0.54, away: 0.46, source: 'moneyline' },
        lines: { homeMoneyline: -130, awayMoneyline: 118, spread: -2.5, total: 47.5 }
      }
    });

    expect(result).toEqual({
      is_heuristic: true,
      signals: [
        {
          name: 'steam_window',
          label: 'Steam window',
          direction: 'up',
          confidence_band: { min: 0.45, max: 0.7, label: 'elevated' },
          rationale:
            'Kickoff proximity (35m) with implied split 8.0% can indicate late-book pressure. Heuristic only.'
        },
        {
          name: 'news_lag_heuristic',
          label: 'News-lag heuristic',
          direction: 'up',
          confidence_band: { min: 0.35, max: 0.62, label: 'medium' },
          rationale:
            'No explicit degradation flag. Timing window (35m) is used as a proxy for potential headline-to-market lag. Heuristic only.'
        },
        {
          name: 'book_divergence_compression',
          label: 'Book divergence compression',
          direction: 'up',
          confidence_band: { min: 0.42, max: 0.68, label: 'elevated' },
          rationale:
            'Spread -2.5 and total 47.5 are compared to a neutral baseline to classify cross-market compression. Heuristic only.'
        }
      ]
    });
  });

  it('downgrades confidence and direction when snapshot is degraded', () => {
    const result = evaluateHeuristicMicrostructure({
      snapshotLoadedAt: '2026-01-10T12:00:00.000Z',
      game: {
        gameId: 'NBA_DEMO_1',
        startsAt: '2026-01-10T18:00:00.000Z',
        degraded: true,
        source: 'derived',
        homeTeam: 'Lakers',
        awayTeam: 'Celtics',
        implied: { home: 0.5, away: 0.5, source: 'fallback' },
        lines: { spread: -7.5, total: 233.5 }
      }
    });

    expect(result.is_heuristic).toBe(true);
    expect(result.signals).toEqual([
      {
        name: 'steam_window',
        label: 'Steam window',
        direction: 'neutral',
        confidence_band: { min: 0.3, max: 0.6, label: 'medium' },
        rationale:
          'Kickoff is 360m away; steam-style pressure is treated as lower urgency in this heuristic.'
      },
      {
        name: 'news_lag_heuristic',
        label: 'News-lag heuristic',
        direction: 'down',
        confidence_band: { min: 0.2, max: 0.4, label: 'low' },
        rationale:
          'Market snapshot flagged as degraded (derived); stale-input risk elevated between Celtics and Lakers. Heuristic only.'
      },
      {
        name: 'book_divergence_compression',
        label: 'Book divergence compression',
        direction: 'neutral',
        confidence_band: { min: 0.25, max: 0.5, label: 'low' },
        rationale:
          'Spread -7.5 and total 233.5 are compared to a neutral baseline to classify cross-market compression. Heuristic only.'
      }
    ]);
  });
});
