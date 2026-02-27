/** @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import { FrontdoorLandingClient } from '@/src/components/landing/FrontdoorLandingClient';
import { renderWithNervousSystem } from '@/src/test-utils/renderWithNervousSystem';

let slipState: Array<{ id: string; player: string; marketType: string; line: string; odds: string; game?: string }> = [];
const addLeg = vi.fn((leg) => { if (!slipState.some((item) => item.id === leg.id)) slipState.push(leg); });
const removeLeg = vi.fn((legId: string) => { slipState = slipState.filter((leg) => leg.id !== legId); });

vi.mock('@/src/hooks/useDraftSlip', () => ({
  useDraftSlip: () => ({ slip: slipState, addLeg, removeLeg, getSlip: vi.fn(), updateLeg: vi.fn(), setSlip: vi.fn(), clearSlip: vi.fn() })
}));

describe('FrontdoorLandingClient live modes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    slipState = [];
  });

  it('renders active slate rows', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, trace_id: 't1', data: { mode: 'live', status: 'active', games: [{ id: 'g1', matchup: 'NYK @ IND', startTime: '7:00 PM' }], board: [{ id: 'p1', gameId: 'g1', player: 'Player 1', market: 'points', line: '20.5', odds: '-110', hitRateL10: 63 }] } }) })));
    renderWithNervousSystem(<FrontdoorLandingClient />);
    await waitFor(() => expect(screen.getByText('NYK @ IND')).toBeTruthy());
    expect(screen.getByText('Player 1')).toBeTruthy();
  });

  it('renders next slate chip copy', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, trace_id: 't2', data: { mode: 'live', status: 'next', nextAvailableStartTime: '2026-01-15T20:00:00.000Z', games: [{ id: 'g2', matchup: 'LAL @ DEN', startTime: '8:30 PM' }], board: [] } }) })));
    renderWithNervousSystem(<FrontdoorLandingClient />);
    await waitFor(() => expect(screen.getByText(/Next slate begins at/i)).toBeTruthy());
  });

  it('renders market closed state', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, trace_id: 't3', data: { mode: 'live', status: 'market_closed', games: [], board: [] } }) })));
    renderWithNervousSystem(<FrontdoorLandingClient />);
    await waitFor(() => expect(screen.getByText('Markets closed.')).toBeTruthy());
    expect(screen.getByText('Upload last slip →')).toBeTruthy();
  });

  it('shows partial feed chip', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, trace_id: 't4', data: { mode: 'live', games: [], board: [], providerHealth: [{ provider: 'the-odds-api', ok: false, message: 'timeout' }] } }) })));
    renderWithNervousSystem(<FrontdoorLandingClient />);
    await waitFor(() => expect(screen.getByText('Live feeds: Partial')).toBeTruthy());
    fireEvent.click(screen.getByText('Live feeds: Partial'));
    expect(screen.getByText(/the-odds-api/i)).toBeTruthy();
  });
});
