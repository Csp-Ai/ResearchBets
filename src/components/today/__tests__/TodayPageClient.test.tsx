/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';

import type { TodayPayload } from '@/src/core/today/types';
import { renderWithNervousSystem } from '@/src/test-utils/renderWithNervousSystem';

import { TodayPageClient } from '../TodayPageClient';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

describe('TodayPageClient', () => {
  const payload: TodayPayload = {
    mode: 'demo',
    generatedAt: '2026-02-26T18:00:00.000Z',
    leagues: ['NBA', 'NFL', 'MLB', 'Soccer', 'UFC', 'NHL'],
    games: [
      {
        id: 'nba-live-1',
        league: 'NBA',
        status: 'live',
        startTime: '19:00 ET',
        matchup: 'LAL @ DAL',
        teams: ['LAL', 'DAL'],
        bookContext: 'Unified board resolver',
        provenance: 'deterministic fallback',
        lastUpdated: '2026-02-26T18:00:00.000Z',
        propsPreview: [
          {
            id: 'scout-1',
            player: 'Luka Doncic',
            market: 'points',
            line: '31.5',
            odds: '-112',
            hitRateL10: 72,
            marketImpliedProb: 0.55,
            modelProb: 0.63,
            edgeDelta: 0.08,
            riskTag: 'stable',
            rationale: ['Last-5 role stable', 'Opponent coverage profile supports shot volume'],
            provenance: 'odds + stats',
            lastUpdated: '2026-02-26T18:00:00.000Z'
          },
          {
            id: 'scout-2',
            player: 'LeBron James',
            market: 'rebounds',
            line: '7.5',
            odds: '-108',
            hitRateL10: 50,
            marketImpliedProb: 0.52,
            modelProb: 0.56,
            edgeDelta: 0.04,
            riskTag: 'watch',
            rationale: ['Paint touch volume stable', 'Line still near median outcome'],
            provenance: 'odds + stats',
            lastUpdated: '2026-02-26T18:00:00.000Z'
          }
        ]
      }
    ]
  };

  it('renders edge signals and terminal board controls', () => {
    renderWithNervousSystem(<TodayPageClient initialPayload={payload} />);

    expect(screen.getByRole('heading', { name: 'Board' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Edge signals' })).toBeTruthy();
    expect(screen.getByTestId('sort-select')).toBeTruthy();
    expect(screen.getByTestId('slip-drawer')).toBeTruthy();
    expect(screen.getAllByText(/\+8.0%/).length).toBeGreaterThan(0);
  });

  it('sorts rows by L10 when selected', () => {
    renderWithNervousSystem(<TodayPageClient initialPayload={payload} />);

    const sort = screen.getAllByTestId('sort-select')[0];
    fireEvent.change(sort, { target: { value: 'l10' } });

    const playerCells = screen.getAllByText(/Luka Doncic|LeBron James/);
    expect(playerCells[0].textContent).toContain('Luka Doncic');
  });

  it('renders fallback edge values without NaN', () => {
    const noEdgePayload: TodayPayload = {
      ...payload,
      games: [
        {
          ...payload.games[0],
          propsPreview: [
            {
              ...payload.games[0].propsPreview[0],
              id: 'scout-no-edge',
              edgeDelta: undefined,
              marketImpliedProb: undefined,
              modelProb: undefined
            }
          ]
        }
      ]
    };

    renderWithNervousSystem(<TodayPageClient initialPayload={noEdgePayload} />);
    expect(screen.queryByText('NaN%')).toBeNull();
  });
});
