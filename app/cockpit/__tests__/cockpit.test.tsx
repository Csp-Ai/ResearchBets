/** @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';

import CockpitLandingClient from '@/app/cockpit/CockpitLandingClient';
import { renderWithProviders } from '@/src/test-utils/renderWithProviders';

const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  usePathname: () => '/cockpit',
  useSearchParams: () => new URLSearchParams(window.location.search)
}));

describe('cockpit route client', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, trace_id: 'trace-1', data: { mode: 'demo', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [{ id: 'p1', player: 'J. Tatum', market: 'points', line: '28.5', odds: '-110', hitRateL10: 7, gameId: 'g1', matchup: 'LAL @ BOS', startTime: '8:00 PM' }] } })
    }) as Response));
  });

  it('renders core cockpit sections', async () => {
    renderWithProviders(<CockpitLandingClient />);

    expect(screen.getByText('One leg breaks.')).toBeTruthy();
    expect(screen.getAllByText("Tonight's Board").length).toBeGreaterThan(0);
    expect(screen.getByText('Draft Ticket')).toBeTruthy();
    expect((await screen.findAllByText(/J. Tatum/)).length).toBeGreaterThan(0);
  });
});
