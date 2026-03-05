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
    await screen.findAllByText(/J. Tatum/);

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('mode=live'), expect.any(Object));
  });

  it('clicking row navigates to game context and add button does not navigate', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, trace_id: 'trace-1', data: { mode: 'demo', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [{ id: 'p1', player: 'J. Tatum', market: 'points', line: '28.5', odds: '-110', hitRateL10: 7, gameId: 'g1', matchup: 'LAL @ BOS', startTime: '8:00 PM' }] } })
    }) as unknown as Response));

    renderWithProviders(<CockpitLandingClient />);
    fireEvent.click((await screen.findAllByText(/J. Tatum/))[0]!);
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/game/g1?'));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('highlight=p1'));

    fireEvent.click(screen.getByRole('button', { name: '+' }));
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('mode toggle writes explicit mode into the cockpit url', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, trace_id: 'trace-1', data: { mode: 'live', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [{ id: 'p1', player: 'J. Tatum', market: 'points', line: '28.5', odds: '-110', hitRateL10: 7, gameId: 'g1', matchup: 'LAL @ BOS', startTime: '8:00 PM' }] } })
    }) as unknown as Response));

    renderWithProviders(<CockpitLandingClient />, { mode: 'live' });
    await screen.findAllByText(/J. Tatum/);

    fireEvent.click(screen.getByRole('button', { name: 'Demo' }));
    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('mode=demo'));
  });

  it('renders mobile slip bar and opens drawer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, trace_id: 'trace-1', data: { mode: 'demo', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [
        { id: 'p1', player: 'J. Tatum', market: 'points', line: '28.5', odds: '-110', hitRateL10: 7, gameId: 'g1', matchup: 'LAL @ BOS', startTime: '8:00 PM' }
      ] } })
    }) as unknown as Response));

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

  it('shows TicketEmptyCoach at zero legs and hides after add', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, trace_id: 'trace-coach', data: { mode: 'demo', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [
        { id: 'p1', player: 'J. Tatum', market: 'points', line: '28.5', odds: '-110', gameId: 'g1', matchup: 'LAL @ BOS', startTime: '8:00 PM' }
      ] } })
    }) as unknown as Response));

    renderWithProviders(<CockpitLandingClient />);
    expect(await screen.findByTestId('ticket-empty-coach')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    await waitFor(() => expect(screen.queryByTestId('ticket-empty-coach')).toBeNull());
  });

  it('invokes fly-to-ticket when adding a leg', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, trace_id: 'trace-fly', data: { mode: 'demo', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [
        { id: 'p1', player: 'J. Tatum', market: 'points', line: '28.5', odds: '-110', gameId: 'g1', matchup: 'LAL @ BOS', startTime: '8:00 PM' }
      ] } })
    }) as unknown as Response));

    renderWithProviders(<CockpitLandingClient />);
    await screen.findAllByText(/J. Tatum/);
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    expect(flyToTicketMock).toHaveBeenCalled();
  });
});
