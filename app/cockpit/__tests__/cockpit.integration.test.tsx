/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import CockpitLandingClient from '@/app/cockpit/CockpitLandingClient';
import { renderWithProviders } from '@/src/test-utils/renderWithProviders';
import { NervousSystemProvider } from '@/src/components/nervous/NervousSystemContext';

const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  usePathname: () => '/cockpit',
  useSearchParams: () => new URLSearchParams(window.location.search)
}));

describe('cockpit route integration', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });


  it('defaults today intent to live when mode is omitted in the url', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, trace_id: 'trace-1', data: { mode: 'live', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [{ id: 'p1', player: 'J. Tatum', market: 'points', line: '28.5', odds: '-110', hitRateL10: 7, gameId: 'g1', matchup: 'LAL @ BOS', startTime: '8:00 PM' }] } })
    }) as Response);
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/cockpit?sport=NBA&tz=America%2FPhoenix&date=2026-02-26');

    render(<NervousSystemProvider><CockpitLandingClient /></NervousSystemProvider>);
    await screen.findByText(/J. Tatum/);

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('mode=live'), expect.any(Object));
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

  it('switching sport updates url and refetches board request', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, trace_id: 'trace-1', data: { mode: 'demo', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [{ id: 'p1', player: 'J. Tatum', market: 'points', line: '28.5', odds: '-110', hitRateL10: 7, gameId: 'g1', matchup: 'LAL @ BOS', startTime: '8:00 PM' }] } })
    }) as Response);
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<CockpitLandingClient />);
    await screen.findByText(/J. Tatum/);

    fireEvent.click(screen.getByRole('button', { name: 'NFL' }));
    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('sport=NFL'));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('sport=NBA'), expect.any(Object));
  });

  it('clicking row navigates to game context and add button does not navigate', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, trace_id: 'trace-1', data: { mode: 'demo', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [{ id: 'p1', player: 'J. Tatum', market: 'points', line: '28.5', odds: '-110', hitRateL10: 7, gameId: 'g1', matchup: 'LAL @ BOS', startTime: '8:00 PM' }] } })
    }) as Response));

    renderWithProviders(<CockpitLandingClient />);
    await screen.findByText(/J. Tatum/);

    fireEvent.click(screen.getByText(/J. Tatum/));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/game/g1?'));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('highlight=p1'));

    const addButton = screen.getByRole('button', { name: '+' });
    fireEvent.click(addButton);
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('mode toggle writes explicit mode into the cockpit url', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, trace_id: 'trace-1', data: { mode: 'live', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [{ id: 'p1', player: 'J. Tatum', market: 'points', line: '28.5', odds: '-110', hitRateL10: 7, gameId: 'g1', matchup: 'LAL @ BOS', startTime: '8:00 PM' }] } })
    }) as Response));

    renderWithProviders(<CockpitLandingClient />, { mode: 'live' });
    await screen.findByText(/J. Tatum/);

    fireEvent.click(screen.getByRole('button', { name: 'Demo' }));
    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('mode=demo'));
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

    fireEvent.click(screen.getAllByRole('button', { name: 'Run stress test' })[0]!);

    await waitFor(() => {
      expect(screen.getByText('deterministic reason')).toBeTruthy();
      expect(screen.getAllByText(/Correlation pressure/).length).toBeGreaterThan(0);
    });
  });
});
