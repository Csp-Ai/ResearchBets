/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';

import CockpitLandingClient from '@/app/cockpit/CockpitLandingClient';
import { renderWithProviders } from '@/src/test-utils/renderWithProviders';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/cockpit'
}));

vi.mock('@/app/cockpit/hooks/useCockpitToday', () => ({
  useCockpitToday: () => ({
    board: [
      { id: 'leg-1', player: 'J. Tatum', market: 'points', line: '29.5', odds: '-110', gameId: 'g1', matchup: 'LAL @ BOS', startTime: '8:00 PM', hitRateL10: 7 }
    ],
    today: {
      mode: 'demo',
      generatedAt: '2025-01-01T00:00:00.000Z',
      reason: 'provider_unavailable',
      games: [],
      board: [],
      providerHealth: [{ ok: false }]
    },
    provenance: {
      mode: 'demo',
      reason: 'provider_unavailable',
      generatedAt: '2025-01-01T00:00:00.000Z'
    },
    neutralStatus: 'Demo mode (live feeds off)',
    strictLiveUnavailable: false,
    boardUpdateTick: 0,
    refreshToday: vi.fn()
  })
}));

describe('CockpitLandingClient canonical landing invariants', () => {
  it('renders a bettor-first hero with a single dominant board workflow and draft ticket destination', async () => {
    renderWithProviders(<CockpitLandingClient />);

    expect(screen.getAllByRole('heading', { level: 1, name: "Tonight's Board" }).length).toBeGreaterThan(0);

    const header = screen.getByRole('banner');
    const strips = within(header).getAllByTestId('live-nervous-system-strip');
    expect(strips).toHaveLength(1);

    expect(screen.getByRole('button', { name: /build from board/i })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^paste slip$/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/build a 2–4 leg ticket to expose weakest-leg and correlation pressure before lock/i)).toBeTruthy();
    expect(screen.getAllByText(/decision room/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { level: 2, name: /signals/i })).toBeTruthy();

    const cockpitSection = screen.getByLabelText('Bettor cockpit: board and draft ticket');
    expect(within(cockpitSection).queryByText(/live credibility/i)).toBeNull();
    expect(within(cockpitSection).queryByText(/provider pipeline/i)).toBeNull();
  });

  it('keeps diagnostics collapsed and unrendered until analysis has run', async () => {
    renderWithProviders(<CockpitLandingClient />);

    const disclosure = screen.getAllByTestId('cockpit-details-disclosure')[0] as HTMLElement;
    expect(within(disclosure).queryByTestId('preview-strip')).toBeNull();
    expect(within(disclosure).queryByText('Demo mode (live feeds off)')).toBeNull();
    expect(within(disclosure).getByText(/show system details after analysis/i)).toBeTruthy();

    fireEvent.click(within(disclosure).getByText(/show system details after analysis/i));
    expect(within(disclosure).queryByTestId('preview-strip')).toBeNull();
  });
});
