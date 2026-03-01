/** @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';

import CockpitLandingClient from '@/app/cockpit/CockpitLandingClient';
import { renderWithProviders } from '@/src/test-utils/renderWithProviders';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() })
}));

describe('cockpit route client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, trace_id: 'trace-1', data: { mode: 'demo', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [{ id: 'p1', player: 'J. Tatum', market: 'points', line: '28.5', odds: '-110', hitRateL10: 7, gameId: 'g1', matchup: 'LAL @ BOS', startTime: '8:00 PM' }] } })
    }) as Response));
  });

  it('renders core cockpit sections', async () => {
    renderWithProviders(<CockpitLandingClient />);

    expect(screen.getByText('One leg breaks.')).toBeTruthy();
    expect(screen.getByText("Tonight's Board")).toBeTruthy();
    expect(screen.getByText('Draft Ticket')).toBeTruthy();
    expect(await screen.findByText(/J. Tatum/)).toBeTruthy();
  });
});
