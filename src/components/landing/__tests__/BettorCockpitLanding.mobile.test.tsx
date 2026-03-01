/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';

import { BettorCockpitLanding } from '@/src/components/landing/BettorCockpitLanding';
import { renderWithNervousSystem } from '@/src/test-utils/renderWithNervousSystem';

function setMobileViewport() {
  vi.stubGlobal('innerWidth', 390);
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('max-width') || query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

describe('BettorCockpitLanding mobile', () => {
  beforeEach(() => {
    sessionStorage.clear();
    setMobileViewport();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: {
            mode: 'demo',
            generatedAt: '2026-03-01T00:00:00.000Z',
            leagues: ['NBA'],
            games: [],
            board: [
              { id: 'a1', gameId: 'g1', matchup: 'NYK @ BOS', startTime: '7:10 PM ET', player: 'Jalen Brunson', market: 'assists', line: '6.5', odds: '-115', hitRateL10: 62, riskTag: 'watch' },
              { id: 'a2', gameId: 'g1', matchup: 'NYK @ BOS', startTime: '7:10 PM ET', player: 'Jayson Tatum', market: 'points', line: '28.5', odds: '-110', hitRateL10: 57, riskTag: 'stable' },
            ],
          },
        }),
      })),
    );
  });

  it('renders hero + board, sticky ticket behavior, drawer, stress, trace, copy tone, and spine href continuity', async () => {
    renderWithNervousSystem(<BettorCockpitLanding />);

    expect(screen.getByText(/One leg breaks/i)).toBeTruthy();
    expect(await screen.findByLabelText("Tonight's Board")).toBeTruthy();
    expect(screen.getByText('Ticket (0 legs)')).toBeTruthy();
    expect(screen.getByLabelText('Open ticket drawer')).toBeTruthy();

    expect(screen.queryAllByText((_, el) => (el?.textContent ?? '').includes('Run trace: Idle')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText(/Add Jalen Brunson/i));
    await waitFor(() => expect(screen.getByText('Ticket (1 legs)')).toBeTruthy());
    expect(screen.queryAllByText('Add 1 more leg').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText(/Add Jayson Tatum/i));
    await waitFor(() => expect(screen.getByText('Ticket (2 legs)')).toBeTruthy());
    fireEvent.click(screen.getByLabelText('Open ticket drawer'));
    expect(screen.getByRole('dialog', { name: 'Ticket drawer' })).toBeTruthy();
    const drawer = screen.getByRole('dialog', { name: 'Ticket drawer' });
    expect(within(drawer).getByText(/Jalen Brunson/)).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: 'Run Stress Test' }).find((node) => node.closest('[role="dialog"]'))!);
    await waitFor(() => expect(within(drawer).getByText(/Weakest leg:/)).toBeTruthy());
    expect(within(drawer).getByText(/Correlation pressure:/)).toBeTruthy();
    expect(within(drawer).getByText(/Fragility:/)).toBeTruthy();
    expect(within(drawer).getByRole('button', { name: /Save analysis/i })).toBeTruthy();

    await waitFor(() => expect(screen.queryAllByText((_, el) => (el?.textContent ?? '').includes('Run trace: Complete')).length).toBeGreaterThan(0));

    expect(screen.queryByText(/failed/i)).not.toBeTruthy();
    expect(screen.queryByText(/error/i)).not.toBeTruthy();
    expect(screen.queryByText(/disabled/i)).not.toBeTruthy();

    const href = screen.getByRole('link', { name: /Open full board with current spine/i }).getAttribute('href') ?? '';
    expect(href).toContain('sport=NBA');
    expect(href).toContain('tz=America%2FPhoenix');
    expect(href).toContain('date=2026-02-26');
    expect(href).toContain('mode=demo');
  });
});
