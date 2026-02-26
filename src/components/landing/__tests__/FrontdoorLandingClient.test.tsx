/** @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { FrontdoorLandingClient } from '@/src/components/landing/FrontdoorLandingClient';
import { renderWithNervousSystem } from '@/src/test-utils/renderWithNervousSystem';

const addLeg = vi.fn();
const removeLeg = vi.fn();

vi.mock('@/src/hooks/useDraftSlip', () => ({
  useDraftSlip: () => ({
    slip: [],
    addLeg,
    removeLeg,
    getSlip: vi.fn(),
    updateLeg: vi.fn(),
    setSlip: vi.fn(),
    clearSlip: vi.fn()
  })
}));

describe('FrontdoorLandingClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          ok: true,
          trace_id: 'trace-frontdoor-1',
          data: {
            mode: 'demo',
            reason: 'deterministic_fallback',
            games: [
              { id: 'g1', matchup: 'NYK @ IND', startTime: '7:00 PM' },
              { id: 'g2', matchup: 'LAL @ DEN', startTime: '8:30 PM' }
            ],
            board: Array.from({ length: 6 }, (_, index) => ({
              id: `p-${index + 1}`,
              gameId: index % 2 === 0 ? 'g1' : 'g2',
              player: `Player ${index + 1}`,
              market: 'points',
              line: '20.5',
              odds: '-110',
              hitRateL10: 60,
              riskTag: 'stable'
            }))
          }
        })
      }))
    );
  });

  it('renders canonical demo mode label and board cards', async () => {
    renderWithNervousSystem(<FrontdoorLandingClient />);

    await waitFor(() => {
      expect(screen.getByText('Demo mode (live feeds off)')).toBeTruthy();
    });

    expect(screen.getAllByText('Add leg').length).toBeGreaterThanOrEqual(6);
    expect(screen.getByText('Player 1 · points 20.5')).toBeTruthy();
  });
});
