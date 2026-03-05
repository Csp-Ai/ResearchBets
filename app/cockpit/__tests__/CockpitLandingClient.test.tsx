/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';

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
  it('renders CockpitHeader with a single above-fold nervous truth strip and primary run CTA', async () => {
    renderWithProviders(<CockpitLandingClient />);

    expect(screen.getByRole('heading', { level: 1, name: "Tonight's Board" })).toBeTruthy();

    const header = screen.getByRole('banner');
    const strips = within(header).getAllByTestId('live-nervous-system-strip');
    expect(strips).toHaveLength(1);

    const cockpitSection = screen.getByLabelText('Bettor cockpit: board and draft ticket');
    expect(within(cockpitSection).queryByText(/live credibility/i)).toBeNull();
    expect(within(cockpitSection).queryByText(/provider pipeline/i)).toBeNull();

    const runButtons = screen.getAllByRole('button', { name: /run analysis/i });
    expect(runButtons.length).toBeGreaterThan(0);
    expect(runButtons[0]?.className).toContain('ui-button-primary');
  });
});
