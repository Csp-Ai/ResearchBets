/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';

import CockpitLandingClient from '@/app/cockpit/CockpitLandingClient';
import { renderWithProviders } from '@/src/test-utils/renderWithProviders';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() })
}));

describe('cockpit route integration', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('renders board rows from /api/today', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/today')) {
        return {
          ok: true,
          json: async () => ({ ok: true, trace_id: 'trace-1', data: { mode: 'demo', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [{ id: 'p1', player: 'J. Tatum', market: 'points', line: '28.5', odds: '-110', hitRateL10: 7, gameId: 'g1', matchup: 'LAL @ BOS', startTime: '8:00 PM' }] } })
        } as Response;
      }
      return { ok: true, json: async () => ({ ok: true }) } as Response;
    }));

    renderWithProviders(<CockpitLandingClient />);
    expect(await screen.findByText(/J. Tatum/)).toBeTruthy();
  });



  it('renders mobile slip bar and opens drawer', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/today')) {
        return {
          ok: true,
          json: async () => ({ ok: true, trace_id: 'trace-1', data: { mode: 'demo', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [
            { id: 'p1', player: 'J. Tatum', market: 'points', line: '28.5', odds: '-110', hitRateL10: 7, gameId: 'g1', matchup: 'LAL @ BOS', startTime: '8:00 PM' }
          ] } })
        } as Response;
      }
      return { ok: true, json: async () => ({ ok: true }) } as Response;
    }));

    window.sessionStorage.setItem('rb:draft-slip:v1', JSON.stringify([
      { id: 'p1', player: 'J. Tatum', marketType: 'points', line: '28.5', odds: '-110', game: 'LAL @ BOS' }
    ]));

    renderWithProviders(<CockpitLandingClient />);
    await screen.findAllByText(/J. Tatum/);

    expect(screen.getByTestId('mobile-slip-bar')).toBeTruthy();
    expect(screen.getByTestId('slip-sheet').className).not.toContain('open');

    fireEvent.click(screen.getByRole('button', { name: 'Open slip' }));
    expect(screen.getByTestId('slip-sheet').className).toContain('open');
  });

  it('runs stress test via submit and populates analysis', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/today')) {
        return {
          ok: true,
          json: async () => ({ ok: true, trace_id: 'trace-1', data: { mode: 'demo', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [
            { id: 'p1', player: 'J. Tatum', market: 'points', line: '28.5', odds: '-110', hitRateL10: 7, gameId: 'g1', matchup: 'LAL @ BOS', startTime: '8:00 PM' },
            { id: 'p2', player: 'L. James', market: 'assists', line: '8.5', odds: '-110', hitRateL10: 6, gameId: 'g1', matchup: 'LAL @ BOS', startTime: '8:00 PM' }
          ] } })
        } as Response;
      }
      if (url.includes('/api/run/stress-test')) {
        return {
          ok: true,
          json: async () => ({ trace_id: 'trace-live', spine: { sport: 'NBA', tz: 'America/Phoenix', date: '2026-02-26', mode: 'demo', trace_id: 'trace-live' }, analysis: { weakest_leg: { player: 'J. Tatum' }, correlation_pressure: 0.4, fragility_score: 58, reasons: ['deterministic reason'] }, events_written: true })
        } as Response;
      }
      return { ok: true, json: async () => ({ ok: true }) } as Response;
    }));

    window.sessionStorage.setItem('rb:draft-slip:v1', JSON.stringify([
      { id: 'p1', player: 'J. Tatum', marketType: 'points', line: '28.5', odds: '-110', game: 'LAL @ BOS' },
      { id: 'p2', player: 'L. James', marketType: 'assists', line: '8.5', odds: '-110', game: 'LAL @ BOS' }
    ]));

    renderWithProviders(<CockpitLandingClient />);
    await screen.findAllByText(/J. Tatum/);

    fireEvent.click(screen.getAllByRole('button', { name: 'Stress test slip' })[0]!);

    await waitFor(() => {
      expect(screen.getByText('deterministic reason')).toBeTruthy();
      expect(screen.getAllByText(/Correlation pressure/).length).toBeGreaterThan(0);
    });
  });
});
