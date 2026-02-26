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

  it('renders canonical demo mode label with compact board rows', async () => {
    renderWithNervousSystem(<FrontdoorLandingClient />);

    await waitFor(() => {
      expect(screen.getByText('Demo mode (live feeds off)')).toBeTruthy();
    });

    expect(screen.getByText('Slip rail')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add Player 1 points 20.5 to slip' })).toBeTruthy();
    expect(screen.getByText('Player 1')).toBeTruthy();
    expect(screen.getAllByText('-110').length).toBeGreaterThan(0);
  });

  it('uses desktop rail grid structure and compact plus-minus row controls', async () => {
    const { container } = renderWithNervousSystem(<FrontdoorLandingClient />);

    await waitFor(() => {
      expect(screen.getAllByTestId('slip-rail-desktop').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByTestId('landing-terminal-grid').length).toBeGreaterThan(0);

    const rows = screen.getAllByTestId('terminal-prop-rows');
    expect(rows.length).toBeGreaterThan(0);
    expect(container.querySelector('.legacy-prop-bar')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add Player 1 points 20.5 to slip' }).textContent).toBe('+');
  });

  it('keeps primary CTA disabled when empty and enables after trying sample slip', async () => {
    const view = renderWithNervousSystem(<FrontdoorLandingClient />);

    await waitFor(() => {
      expect(screen.getAllByText('Start by adding legs →').length).toBeGreaterThan(0);
    });

    const sampleAction = screen.getAllByRole('button', { name: 'Try sample slip' })[0];
    fireEvent.click(sampleAction as HTMLElement);
    view.rerender(<FrontdoorLandingClient />);

    await waitFor(() => {
      expect(screen.getAllByText('Stress test this slip →').length).toBeGreaterThan(0);
    });
    expect(addLeg).toHaveBeenCalled();
  });
});
