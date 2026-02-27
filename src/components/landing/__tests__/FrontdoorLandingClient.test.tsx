/** @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';

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
    cleanup();
    vi.clearAllMocks();
    slipState = [];
  });

  it('renders scout cards above collapsed board', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, trace_id: 't1', data: { mode: 'live', status: 'active', games: [{ id: 'g1', matchup: 'NYK @ IND', startTime: '7:00 PM' }], board: [{ id: 'p1', gameId: 'g1', player: 'Player 1', market: 'points', line: '20.5', odds: '-110', hitRateL10: 63, hitRateL5: 40, marketImpliedProb: 51, modelProb: 61, edgeDelta: 10, riskTag: 'watch' }] } }) })));    
    renderWithNervousSystem(<FrontdoorLandingClient />);
    await waitFor(() => expect(screen.getByTestId('scout-cards-panel')).toBeTruthy());
    expect(screen.queryByTestId('terminal-prop-rows')).toBeNull();

    const scoutPanel = screen.getByTestId('scout-cards-panel');
    const boardSection = screen.getByTestId('board-section');
    const relation = scoutPanel.compareDocumentPosition(boardSection);
    expect(Boolean(relation & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

  it('expands props only on explicit action', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, trace_id: 't2', data: { mode: 'live', status: 'active', games: [{ id: 'g2', matchup: 'LAL @ DEN', startTime: '8:30 PM' }], board: [{ id: 'p2', gameId: 'g2', player: 'Player 2', market: 'rebounds', line: '8.5', odds: '-105', hitRateL10: 58 }] } }) })));    
    renderWithNervousSystem(<FrontdoorLandingClient />);
    await waitFor(() => expect(screen.getByText('LAL @ DEN')).toBeTruthy());
    expect(screen.queryByTestId('terminal-prop-rows')).toBeNull();
    const expandButtons = screen.getAllByRole('button', { name: 'Expand props' });
    expect(expandButtons.length).toBeGreaterThan(0);
    fireEvent.click(expandButtons[0] as HTMLElement);
    expect(await screen.findByTestId('terminal-prop-rows')).toBeTruthy();
  });

  it('hides slip rail when no legs and shows prompt', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, trace_id: 't3', data: { mode: 'live', status: 'active', games: [{ id: 'g3', matchup: 'BOS @ MIA', startTime: '9:00 PM' }], board: [{ id: 'p3', gameId: 'g3', player: 'Player 3', market: 'assists', line: '6.5', odds: '-110', hitRateL10: 60 }] } }) })));    
    renderWithNervousSystem(<FrontdoorLandingClient />);
    await waitFor(() => expect(screen.getByTestId('slip-inline-prompt')).toBeTruthy());
    expect(screen.queryByTestId('slip-rail-desktop')).toBeNull();
  });

  it('renders compact market closed state and keeps postmortem prioritized', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, trace_id: 't4', data: { mode: 'live', status: 'market_closed', games: [], board: [] } }) })));    
    renderWithNervousSystem(<FrontdoorLandingClient />);
    await waitFor(() => expect(screen.getByTestId('market-closed-compact')).toBeTruthy());
    expect(screen.getByTestId('postmortem-wedge-wrap')).toBeTruthy();
  });

  it('renders discovery hooks only when computable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, trace_id: 't5', data: { mode: 'live', status: 'active', games: [{ id: 'g5', matchup: 'SAC @ PHX', startTime: '10:00 PM' }], board: [{ id: 'p5', gameId: 'g5', player: 'Player 5', market: 'points', line: '24.5', odds: '-110', hitRateL10: 55 }] } }) })));    
    renderWithNervousSystem(<FrontdoorLandingClient />);
    await waitFor(() => expect(screen.getByText('SAC @ PHX')).toBeTruthy());
    expect(screen.queryByTestId('top-signal-line')).toBeNull();
    expect(screen.queryByTestId('scout-cards-panel')).toBeNull();
  });

  it('preserves spine and trace_id in CTA hrefs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, trace_id: 'trace-from-api', data: { mode: 'live', status: 'active', games: [{ id: 'g6', matchup: 'DAL @ MIN', startTime: '6:00 PM' }], board: [{ id: 'p6', gameId: 'g6', player: 'Player 6', market: 'points', line: '21.5', odds: '+120', hitRateL10: 62, hitRateL5: 35, marketImpliedProb: 45, modelProb: 58, edgeDelta: 13, riskTag: 'watch' }] } }) })));    
    renderWithNervousSystem(<FrontdoorLandingClient />);
    await waitFor(() => expect(screen.getByTestId('scout-cards-panel')).toBeTruthy());
    const ctas = screen.getAllByRole('link', { name: /open board filter|stress-test angle|review game panel/i });
    expect(ctas.length).toBeGreaterThan(0);
    const href = (ctas[0] as HTMLElement).getAttribute('href') ?? '';
    expect(href).toContain('trace_id=trace-from-api');
    expect(href).toContain('sport=NBA');
    expect(href).toContain('tz=');
    expect(href).toContain('date=');
  });
});
