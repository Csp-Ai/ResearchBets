/** @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import { FrontdoorLandingClient } from '@/src/components/landing/FrontdoorLandingClient';
import { renderWithNervousSystem } from '@/src/test-utils/renderWithNervousSystem';

let slipState: Array<{ id: string; player: string; marketType: string; line: string; odds: string; game?: string }> = [];

const addLeg = vi.fn((leg) => {
  if (!slipState.some((item) => item.id === leg.id)) slipState.push(leg);
});
const removeLeg = vi.fn((legId: string) => {
  slipState = slipState.filter((leg) => leg.id !== legId);
});

vi.mock('@/src/hooks/useDraftSlip', () => ({
  useDraftSlip: () => ({
    slip: slipState,
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
    slipState = [];
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

    expect(screen.getAllByText('Add leg').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Player 1')).toBeTruthy();
  });

  it('keeps primary CTA disabled when empty and enables after trying sample slip', async () => {
    const view = renderWithNervousSystem(<FrontdoorLandingClient />);

    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: 'Start by adding legs' }).length).toBeGreaterThan(0);
    });

    const sampleAction = screen.getAllByRole('button', { name: 'Try sample slip' })[0];
    expect(sampleAction).toBeTruthy();
    fireEvent.click(sampleAction as HTMLElement);
    view.rerender(<FrontdoorLandingClient />);

    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: 'Stress test this slip' }).length).toBeGreaterThan(0);
    });
    expect(addLeg).toHaveBeenCalled();
  });
});
