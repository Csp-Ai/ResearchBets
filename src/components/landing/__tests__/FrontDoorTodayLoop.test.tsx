/** @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { renderWithNervousSystem } from '@/src/test-utils/renderWithNervousSystem';

import LandingVisionClient from '../LandingVisionClient';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push })
}));

describe('LandingVisionClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/today')) {
        return {
          ok: true,
          json: async () => ({
            mode: 'demo',
            reason: 'deterministic_fallback',
            games: [
              { id: 'g1', matchup: 'AAA @ BBB', startTime: '7:00 PM' },
              { id: 'g2', matchup: 'CCC @ DDD', startTime: '8:00 PM' },
              { id: 'g3', matchup: 'EEE @ FFF', startTime: '9:00 PM' }
            ],
            board: Array.from({ length: 6 }, (_, index) => ({
              id: `p-${index}`,
              player: `Player ${index}`,
              market: 'points',
              line: '20.5',
              odds: '-110',
              hitRateL10: 60,
              gameId: index % 2 === 0 ? 'g1' : 'g2'
            }))
          })
        } as Response;
      }

      if (url.includes('/api/slips/recent')) {
        return {
          ok: true,
          json: async () => ({
            slips: [{ id: 's1', title: 'Recent slip', note: 'Example note', trace_id: 'trace-1' }]
          })
        } as Response;
      }

      return {
        ok: false,
        json: async () => ({})
      } as Response;
    }));
  });

  it('renders today loop panel and more than one board card on the front door', async () => {
    renderWithNervousSystem(<LandingVisionClient />);

    expect(screen.getByLabelText('today-loop-panel')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getAllByText('Add to slip').length).toBeGreaterThan(1);
    });

    expect(screen.getByText("Tonight's Board")).toBeTruthy();
  });
});
