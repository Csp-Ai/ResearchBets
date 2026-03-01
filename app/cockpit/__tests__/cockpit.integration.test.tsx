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
      if (url.includes('/api/slips/submit')) {
        return {
          ok: true,
          json: async () => ({ ok: true, trace_id: 'trace-live', data: { slip_id: '123e4567-e89b-12d3-a456-426614174000', trace_id: 'trace-live', anon_id: 'anon-1', spine: {}, trace: {}, parse: { confidence: 0.8, legs_count: 2, needs_review: false } } })
        } as Response;
      }
      if (url.includes('/api/slips/extract')) {
        return {
          ok: true,
          json: async () => ({ ok: true, trace_id: 'trace-live', data: { slip_id: '123e4567-e89b-12d3-a456-426614174000', trace_id: 'trace-live', extracted_legs: [], leg_insights: [] } })
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

    fireEvent.click(screen.getAllByRole('button', { name: 'Run Stress Test' })[0]!);

    await waitFor(() => {
      expect(screen.getByText('trace-live')).toBeTruthy();
      expect(screen.getAllByText(/Correlation pressure/).length).toBeGreaterThan(0);
    });
  });
});
