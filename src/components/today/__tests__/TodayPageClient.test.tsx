/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';

import type { TodayPayload } from '@/src/core/today/types';
import { renderWithNervousSystem } from '@/src/test-utils/renderWithNervousSystem';

import { TodayPageClient } from '../TodayPageClient';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

describe('TodayPageClient', () => {
  it('renders top spots instead of upcoming empty state when no upcoming games exist', () => {
    const payload: TodayPayload = {
      mode: 'demo',
      generatedAt: '2026-02-26T18:00:00.000Z',
      leagues: ['NBA', 'NFL', 'MLB', 'Soccer', 'UFC', 'NHL'],
      games: [
        {
          id: 'nba-live-1',
          league: 'NBA',
          status: 'live',
          startTime: 'Q2 04:21',
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
              rationale: ['Paint touch volume stable', 'Line still near median outcome'],
              provenance: 'odds + stats',
              lastUpdated: '2026-02-26T18:00:00.000Z'
            }
          ]
        }
      ]
    };

    renderWithNervousSystem(<TodayPageClient initialPayload={payload} />);

    expect(screen.getByRole('heading', { name: 'Board' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Live now' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Upcoming' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Top spots' })).toBeTruthy();
    expect(screen.queryByText('No games for this filter.')).toBeNull();

    expect(screen.getByText(/Luka Doncic points 31.5/i)).toBeTruthy();
    expect(screen.getByText('Last-5 role stable')).toBeTruthy();
  });
});
