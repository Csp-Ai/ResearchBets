import { describe, expect, it } from 'vitest';

import { fallbackToday } from '@/src/core/today/fallback';

import { buildBoardViewModel } from '../boardViewModel';

describe('buildBoardViewModel', () => {
  it('uses live odds and computes best odds while preserving board length', () => {
    const today = fallbackToday();
    const firstGame = today.games[0];
    expect(firstGame).toBeTruthy();

    const viewModel = buildBoardViewModel(today, {
      loadedAt: '2026-01-01T00:00:00.000Z',
      games: [
        {
          gameId: firstGame!.id,
          lines: {
            homeMoneyline: -110,
            awayMoneyline: 120,
            spread: -3.5
          }
        }
      ]
    });

    expect(viewModel.length).toBeGreaterThanOrEqual(6);
    const firstLive = viewModel.find((item) => item.is_live);
    expect(firstLive).toBeTruthy();
    expect(firstLive?.best_odds).toEqual({ book: 'Away ML', odds: 120 });
    expect(firstLive?.live_odds?.length).toBeGreaterThan(0);
  });

  it('falls back to consensus odds and stays non-empty without live odds', () => {
    const today = fallbackToday();
    const viewModel = buildBoardViewModel(today);

    expect(viewModel.length).toBeGreaterThan(0);
    expect(viewModel.every((item) => item.is_live === false)).toBe(true);
    expect(viewModel[0]?.consensus_odds).toBeTruthy();
  });
});
