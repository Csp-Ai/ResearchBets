/** @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

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

      if (url.includes('/api/events')) {
        return {
          ok: true,
          json: async () => ({ events: [] })
        } as Response;
      }

      return {
        ok: false,
        json: async () => ({})
      } as Response;
    }));
  });

  it('renders front door primitives and board density', async () => {
    renderWithNervousSystem(<LandingVisionClient />);

    expect(screen.getByLabelText('today-loop-panel')).toBeTruthy();
    expect(screen.getByLabelText('mode-health-strip')).toBeTruthy();
    expect(screen.getByLabelText('proof-strip')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getAllByText('Add to slip').length).toBeGreaterThan(1);
    });

    expect(screen.getByLabelText('today-board')).toBeTruthy();
  });

  it('shows tracker with trace id after run risk', async () => {
    renderWithNervousSystem(<LandingVisionClient />);

    const runButtons = await screen.findAllByText('Run risk');
    fireEvent.click(runButtons[0]!);

    await waitFor(() => {
      expect(screen.getByLabelText('tracker-lite')).toBeTruthy();
      expect(screen.getByText(/trace_id:/)).toBeTruthy();
      expect(screen.getByText('Parse')).toBeTruthy();
    });
  });
});
