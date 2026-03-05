/** @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';

import CockpitLandingClient from '@/app/cockpit/CockpitLandingClient';
import { renderWithProviders } from '@/src/test-utils/renderWithProviders';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/cockpit'
}));

vi.mock('@/src/core/events/useRunEvents', () => ({
  useRunEvents: () => ({ events: [{ type: 'stage_analyze_started', ts: new Date().toISOString() }], latestStage: 'analyzing', statusText: 'Analyzing slip' })
}));

describe('cockpit run status', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, trace_id: 'trace-ui-1234', data: { mode: 'demo', generatedAt: new Date().toISOString(), leagues: ['NBA'], games: [], board: [{ id: 'p1', player: 'J. Tatum', market: 'points', line: '28.5', odds: '-110', hitRateL10: 7, gameId: 'g1', matchup: 'LAL @ BOS', startTime: '8:00 PM' }] } })
    }) as Response));
  });

  it('reflects analyzing stage text from realtime events hook in ticket rail', async () => {
    renderWithProviders(<CockpitLandingClient />, { sport: 'NBA', tz: 'UTC', date: '2026-01-20', mode: 'demo', trace_id: 'trace-ui-1234' });
    expect(await screen.findByText('Analyzing slip')).toBeTruthy();
    const ticketPanel = screen.getByText('Draft Ticket').closest('section');
    expect(ticketPanel).toBeTruthy();
    expect(within(ticketPanel as HTMLElement).getByText('Analyzing slip')).toBeTruthy();
  });
});
