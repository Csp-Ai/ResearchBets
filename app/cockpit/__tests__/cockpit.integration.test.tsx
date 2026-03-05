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

const flyToTicketMock = vi.fn();

vi.mock('@/src/components/landing/flyToTicket', () => ({
  flyToTicket: (...args: unknown[]) => flyToTicketMock(...args)
}));

describe('cockpit route integration', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    flyToTicketMock.mockReset();
  });


  it('defaults today intent to live when mode is omitted in the url', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, trace_id: 'trace-1', data: { mode: 'live', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [{ id: 'p1', player: 'J. Tatum', market: 'points', line: '28.5', odds: '-110', hitRateL10: 7, gameId: 'g1', matchup: 'LAL @ BOS', startTime: '8:00 PM' }] } })
    }) as unknown as Response);
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
        } as unknown as Response;
      }
      return { ok: true, json: async () => ({ ok: true }) } as unknown as Response;
    }));

    renderWithProviders(<CockpitLandingClient />);
    expect(await screen.findByText(/J. Tatum/)).toBeTruthy();
  });

  it('switching sport updates url and refetches board request', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, trace_id: 'trace-1', data: { mode: 'demo', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [{ id: 'p1', player: 'J. Tatum', market: 'points', line: '28.5', odds: '-110', hitRateL10: 7, gameId: 'g1', matchup: 'LAL @ BOS', startTime: '8:00 PM' }] } })
    }) as unknown as Response);
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
    }) as unknown as Response));

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
    }) as unknown as Response));

    renderWithProviders(<CockpitLandingClient />, { mode: 'live' });
    await screen.findByText(/J. Tatum/);

    fireEvent.click(screen.getByRole('button', { name: 'Demo' }));
    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('mode=demo'));
  });



  it('shows live credibility strip chips with provenance mode and freshness', async () => {
    const generatedAt = new Date(Date.now() - 12_000).toISOString();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      headers: { get: () => null },
      json: async () => ({
        ok: true,
        trace_id: 'trace-1',
        data: { mode: 'live', generatedAt, leagues: ['NBA'], games: [], board: [] },
        provenance: { mode: 'live', generatedAt, reason: 'live_ok' }
      })
    }) as unknown as Response));

    renderWithProviders(<CockpitLandingClient />, { mode: 'live' });

    expect(await screen.findByLabelText('Live credibility strip')).toBeTruthy();
    expect(screen.getByText('Mode Live')).toBeTruthy();
    expect(screen.getByText(/Updated \d+s ago/)).toBeTruthy();
  });

  it('polls /api/today only when served mode is live', async () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    const liveFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({
        ok: true,
        trace_id: 'trace-1',
        data: { mode: 'live', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [] },
        provenance: { mode: 'live', generatedAt: new Date().toISOString(), reason: 'live_ok' }
      })
    }) as unknown as Response);
    vi.stubGlobal('fetch', liveFetch);

    renderWithProviders(<CockpitLandingClient />, { mode: 'live' });
    await screen.findByLabelText('Live credibility strip');

    await waitFor(() => {
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 25000);
    });
  });

  it('does not poll /api/today in demo mode and refresh adds refresh=1', async () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({
        ok: true,
        trace_id: 'trace-1',
        data: { mode: 'demo', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [] },
        provenance: { mode: 'demo', generatedAt: new Date().toISOString(), reason: 'provider_unavailable' }
      })
    }) as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<CockpitLandingClient />, { mode: 'demo' });
    await screen.findByLabelText('Live credibility strip');

    expect(setIntervalSpy).not.toHaveBeenCalledWith(expect.any(Function), 25000);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('refresh=1'), expect.any(Object));
    });
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
        } as unknown as Response;
      }
      return { ok: true, json: async () => ({ ok: true }) } as unknown as Response;
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

  it('runs cockpit draft through canonical endpoint and renders integrity signals', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/today')) {
        return {
          ok: true,
          json: async () => ({ ok: true, trace_id: 'trace-1', data: { mode: 'demo', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [
            { id: 'p1', player: 'J. Tatum', market: 'points', line: '28.5', odds: '-110', hitRateL10: 7, gameId: 'g1', matchup: 'LAL @ BOS', startTime: '8:00 PM' },
            { id: 'p2', player: 'L. James', market: 'assists', line: '8.5', odds: '-110', hitRateL10: 6, gameId: 'g1', matchup: 'LAL @ BOS', startTime: '8:00 PM' }
          ] } })
        } as unknown as Response;
      }
      if (url.includes('/api/run/stress-test')) {
        return {
          ok: true,
          json: async () => ({ trace_id: 'trace-live', spine: { sport: 'NBA', tz: 'America/Phoenix', date: '2026-02-26', mode: 'demo', trace_id: 'trace-live' }, run: { run_id: 'trace-live', verdict: { weakest_leg_id: 'p1', fragility_score: 58, reasons: ['deterministic reason'] } }, events_written: true })
        } as unknown as Response;
      }
      if (url.includes('/api/metrics/calibration')) {
        return {
          ok: true,
          json: async () => ({ ok: true, data: { runs_analyzed: 0, take_accuracy: 0, weakest_leg_accuracy: 0, last_updated: null } })
        } as unknown as Response;
      }
      return { ok: true, json: async () => ({ ok: true }) } as unknown as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    window.sessionStorage.setItem('rb:draft-slip:v1', JSON.stringify([
      { id: 'p1', player: 'J. Tatum', marketType: 'points', line: '28.5', odds: '-110', game: 'LAL @ BOS' },
      { id: 'p2', player: 'L. James', marketType: 'assists', line: '8.5', odds: '-110', game: 'LAL @ BOS' }
    ]));

    renderWithProviders(<CockpitLandingClient />);
    await screen.findAllByText(/J. Tatum/);

    fireEvent.click(screen.getAllByRole('button', { name: 'Run analysis' })[0]!);

    await waitFor(() => {
      expect(screen.getAllByText('deterministic reason').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Correlation pressure/).length).toBeGreaterThan(0);
      expect(screen.getByText(/Calibration: not enough outcomes yet/)).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/run/stress-test'), expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith('/api/metrics/calibration', expect.any(Object));
    expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('/stress-test?'));
  });

  it('renders hero proof card and nervous pulse above fold', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, trace_id: 'trace-proof', data: { mode: 'demo', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [] } })
    }) as unknown as Response));

    renderWithProviders(<CockpitLandingClient />);
    expect(await screen.findByTestId('hero-proof-card')).toBeTruthy();
    expect(screen.getByTestId('nervous-pulse')).toBeTruthy();
  });

  it('renders fragility preview above hero proof when board rows exist', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, trace_id: 'trace-fragility', data: { mode: 'live', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [
        { id: 'p1', player: 'S. Curry', market: '3PM', line: '4.5', odds: '-115', gameId: 'g1', matchup: 'LAL @ GSW', startTime: '10:00 PM', riskTag: 'watch', threesAttL1: 3, threesAttL3Avg: 8 }
      ] } })
    }) as unknown as Response));

    renderWithProviders(<CockpitLandingClient />);
    const fragilityCard = await screen.findByTestId('board-fragility-preview');
    const proofCard = screen.getByTestId('hero-proof-card');

    expect(fragilityCard.compareDocumentPosition(proofCard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('invokes fly-to-ticket when adding a leg', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, trace_id: 'trace-fly', data: { mode: 'demo', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [
        { id: 'p1', player: 'J. Tatum', market: 'points', line: '28.5', odds: '-110', gameId: 'g1', matchup: 'LAL @ BOS', startTime: '8:00 PM' }
      ] } })
    }) as unknown as Response));

    renderWithProviders(<CockpitLandingClient />);
    await screen.findByText(/J. Tatum/);
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    expect(flyToTicketMock).toHaveBeenCalled();
  });

  it('respects reduced motion for nervous pulse', async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false
    })) as unknown as typeof window.matchMedia;

    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, trace_id: 'trace-rm', data: { mode: 'demo', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [] } })
    }) as unknown as Response));

    renderWithProviders(<CockpitLandingClient />);
    expect((await screen.findByTestId('nervous-pulse')).getAttribute('data-reduced-motion')).toBe('true');
    window.matchMedia = original;
  });

});
