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
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: true,
          json: async () => ({
            ok: true,
            trace_id: 'trace-1',
            data: {
              mode: 'live',
              generatedAt: new Date().toISOString(),
              leagues: ['NBA'],
              games: [],
              board: [
                {
                  id: 'p1',
                  player: 'J. Tatum',
                  market: 'points',
                  line: '28.5',
                  odds: '-110',
                  hitRateL10: 7,
                  gameId: 'g1',
                  matchup: 'LAL @ BOS',
                  startTime: '8:00 PM'
                }
              ]
            }
          })
        }) as unknown as Response
    );
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/cockpit?sport=NBA&tz=America%2FPhoenix&date=2026-02-26');

    render(
      <NervousSystemProvider>
        <CockpitLandingClient />
      </NervousSystemProvider>
    );
    await screen.findAllByText(/J. Tatum/);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('mode=live'),
      expect.any(Object)
    );
  });

  it('clicking row navigates to game context and add button does not navigate', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          ({
            ok: true,
            json: async () => ({
              ok: true,
              trace_id: 'trace-1',
              data: {
                mode: 'demo',
                generatedAt: new Date().toISOString(),
                leagues: ['NBA'],
                games: [],
                board: [
                  {
                    id: 'p1',
                    player: 'J. Tatum',
                    market: 'points',
                    line: '28.5',
                    odds: '-110',
                    hitRateL10: 7,
                    gameId: 'g1',
                    matchup: 'LAL @ BOS',
                    startTime: '8:00 PM'
                  }
                ]
              }
            })
          }) as unknown as Response
      )
    );

    renderWithProviders(<CockpitLandingClient />);
    fireEvent.click((await screen.findAllByText(/J. Tatum/))[0]!);
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/game/g1?'));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('highlight=p1'));

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('mode toggle writes explicit mode into the cockpit url', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          ({
            ok: true,
            json: async () => ({
              ok: true,
              trace_id: 'trace-1',
              data: {
                mode: 'live',
                generatedAt: new Date().toISOString(),
                leagues: ['NBA'],
                games: [],
                board: [
                  {
                    id: 'p1',
                    player: 'J. Tatum',
                    market: 'points',
                    line: '28.5',
                    odds: '-110',
                    hitRateL10: 7,
                    gameId: 'g1',
                    matchup: 'LAL @ BOS',
                    startTime: '8:00 PM'
                  }
                ]
              }
            })
          }) as unknown as Response
      )
    );

    renderWithProviders(<CockpitLandingClient />, { mode: 'live' });
    await screen.findAllByText(/J. Tatum/);

    fireEvent.click(screen.getByRole('button', { name: 'Demo' }));
    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('mode=demo'));
  });

  it('renders mobile slip bar and opens drawer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          ({
            ok: true,
            json: async () => ({
              ok: true,
              trace_id: 'trace-1',
              data: {
                mode: 'demo',
                generatedAt: new Date().toISOString(),
                leagues: ['NBA'],
                games: [],
                board: [
                  {
                    id: 'p1',
                    player: 'J. Tatum',
                    market: 'points',
                    line: '28.5',
                    odds: '-110',
                    hitRateL10: 7,
                    gameId: 'g1',
                    matchup: 'LAL @ BOS',
                    startTime: '8:00 PM'
                  }
                ]
              }
            })
          }) as unknown as Response
      )
    );

    window.sessionStorage.setItem(
      'rb:draft-slip:v1',
      JSON.stringify([
        {
          id: 'p1',
          player: 'J. Tatum',
          marketType: 'points',
          line: '28.5',
          odds: '-110',
          game: 'LAL @ BOS'
        }
      ])
    );

    renderWithProviders(<CockpitLandingClient />);
    await screen.findAllByText(/J. Tatum/);

    expect(screen.getByTestId('mobile-slip-bar')).toBeTruthy();
    expect(screen.getByTestId('slip-sheet').className).not.toContain('open');

    fireEvent.click(screen.getByRole('button', { name: /open ticket/i }));
    expect(screen.getByTestId('slip-sheet').className).toContain('open');
  });

  it('shows TicketEmptyCoach at zero legs and hides after add', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          ({
            ok: true,
            json: async () => ({
              ok: true,
              trace_id: 'trace-coach',
              data: {
                mode: 'demo',
                generatedAt: new Date().toISOString(),
                leagues: ['NBA'],
                games: [],
                board: [
                  {
                    id: 'p1',
                    player: 'J. Tatum',
                    market: 'points',
                    line: '28.5',
                    odds: '-110',
                    gameId: 'g1',
                    matchup: 'LAL @ BOS',
                    startTime: '8:00 PM'
                  }
                ]
              }
            })
          }) as unknown as Response
      )
    );

    renderWithProviders(<CockpitLandingClient />);
    expect(await screen.findByTestId('ticket-empty-coach')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(screen.queryByTestId('ticket-empty-coach')).toBeNull());
  });

  it('analyze action adds the leg and keeps row navigation scoped', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          ({
            ok: true,
            json: async () => ({
              ok: true,
              trace_id: 'trace-analyze',
              data: {
                mode: 'demo',
                generatedAt: new Date().toISOString(),
                leagues: ['NBA'],
                games: [],
                board: [
                  {
                    id: 'p1',
                    player: 'J. Tatum',
                    market: 'points',
                    line: '28.5',
                    odds: '-110',
                    hitRateL10: 7,
                    gameId: 'g1',
                    matchup: 'LAL @ BOS',
                    startTime: '8:00 PM',
                    edgeDelta: 0.06,
                    modelProb: 0.59,
                    marketImpliedProb: 0.53
                  }
                ]
              }
            })
          }) as unknown as Response
      )
    );

    renderWithProviders(<CockpitLandingClient />);
    await screen.findAllByText(/J. Tatum/);

    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));
    expect(screen.getAllByText(/1 leg/i).length).toBeGreaterThan(0);
    expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('/game/g1?'));
  });

  it('evolves the same ticket rail into live mode when a tracked ticket is present', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          ({
            ok: true,
            json: async () => ({
              ok: true,
              trace_id: 'trace-live-loop',
              data: {
                mode: 'live',
                generatedAt: new Date().toISOString(),
                leagues: ['NBA'],
                games: [],
                board: [
                  {
                    id: 'p1',
                    player: 'J. Tatum',
                    market: 'points',
                    line: '28.5',
                    odds: '-110',
                    gameId: 'g1',
                    matchup: 'LAL @ BOS',
                    startTime: '8:00 PM'
                  }
                ]
              }
            })
          }) as unknown as Response
      )
    );

    window.localStorage.setItem(
      'rb:tracked-tickets:v1',
      JSON.stringify({
        version: 1,
        tickets: [
          {
            ticketId: 'ticket-live-1',
            createdAt: '2026-03-22T00:00:00.000Z',
            sourceHint: 'paste',
            rawSlipText: 'Jamal Murray over 2.5 threes',
            trace_id: 'trace-live-loop',
            slip_id: 'slip-live-loop',
            mode: 'live',
            legs: [
              {
                legId: 'leg-1',
                league: 'NBA',
                gameId: 'DEN@PHX',
                player: 'Jamal Murray',
                marketType: 'threes',
                threshold: 2.5,
                direction: 'over',
                source: 'fanduel',
                parseConfidence: 'high'
              },
              {
                legId: 'leg-2',
                league: 'NBA',
                gameId: 'DEN@PHX',
                player: 'Aaron Gordon',
                marketType: 'rebounds',
                threshold: 6.5,
                direction: 'over',
                source: 'fanduel',
                parseConfidence: 'high'
              }
            ]
          }
        ]
      })
    );

    renderWithProviders(<CockpitLandingClient />, { mode: 'live', trace_id: 'trace-live-loop' });
    await screen.findAllByText(/J. Tatum/);

    expect(screen.getAllByText('Active Ticket').length).toBeGreaterThan(0);
    expect(screen.getByText(/Live ticket command surface/i)).toBeTruthy();
    expect(screen.getByText(/Ticket pressure/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /open live tracking/i })).toBeTruthy();
  });

  it('invokes fly-to-ticket when adding a leg', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          ({
            ok: true,
            json: async () => ({
              ok: true,
              trace_id: 'trace-fly',
              data: {
                mode: 'demo',
                generatedAt: new Date().toISOString(),
                leagues: ['NBA'],
                games: [],
                board: [
                  {
                    id: 'p1',
                    player: 'J. Tatum',
                    market: 'points',
                    line: '28.5',
                    odds: '-110',
                    gameId: 'g1',
                    matchup: 'LAL @ BOS',
                    startTime: '8:00 PM'
                  }
                ]
              }
            })
          }) as unknown as Response
      )
    );

    renderWithProviders(<CockpitLandingClient />);
    await screen.findAllByText(/J. Tatum/);
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(flyToTicketMock).toHaveBeenCalled();
  });
});
