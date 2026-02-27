/** @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';

import { FrontdoorLandingClient } from '@/src/components/landing/FrontdoorLandingClient';
import { renderWithNervousSystem } from '@/src/test-utils/renderWithNervousSystem';

let slipState: Array<{ id: string; player: string; marketType: string; line: string; odds: string; game?: string }> = [];
const addLeg = vi.fn((leg) => { if (!slipState.some((item) => item.id === leg.id)) slipState.push(leg); });
const removeLeg = vi.fn((legId: string) => { slipState = slipState.filter((leg) => leg.id !== legId); });
const updateLeg = vi.fn((nextLeg) => {
  slipState = slipState.map((leg) => (leg.id === nextLeg.id ? nextLeg : leg));
});

vi.mock('@/src/hooks/useDraftSlip', () => ({
  useDraftSlip: () => ({ slip: slipState, addLeg, removeLeg, updateLeg, getSlip: vi.fn(), setSlip: vi.fn(), clearSlip: vi.fn() })
}));

describe('FrontdoorLandingClient live modes', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    slipState = [];
    window.localStorage.clear();
  });

  it('renders value board surface and neutral feed chip copy', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, trace_id: 't1', data: { mode: 'demo', status: 'active', games: [{ id: 'g1', matchup: 'NYK @ IND', startTime: '7:00 PM' }], board: [{ id: 'p1', gameId: 'g1', player: 'Player 1', market: 'points', line: '20.5', odds: '-110', hitRateL10: 63, hitRateL5: 40, riskTag: 'watch' }] } }) } as Response)));
    renderWithNervousSystem(<FrontdoorLandingClient />);

    await waitFor(() => expect(screen.getByTestId('board-section')).toBeTruthy());
    expect(screen.getByText("Tonight's Board")).toBeTruthy();
    expect(screen.getAllByText('Demo mode (live feeds off)').length).toBeGreaterThan(0);
    expect(screen.getByText(/Fast add/)).toBeTruthy();
  });

  it('renders quick slip rail empty state actions when no legs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, trace_id: 'quick-empty', data: { mode: 'demo', status: 'active', games: [], board: [] } }) } as Response)));

    renderWithNervousSystem(<FrontdoorLandingClient />);

    await waitFor(() => expect(screen.getByTestId('quick-slip-rail')).toBeTruthy());
    expect(screen.getByTestId('quick-slip-empty-state')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Paste slip' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Try sample slip' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Build from Board' })).toBeTruthy();
  });

  it('adding a board prop populates quick slip rail leg list', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, trace_id: 'quick-add', data: { mode: 'demo', status: 'active', games: [{ id: 'g1', matchup: 'DAL @ PHX', startTime: '8:00 PM' }], board: [{ id: 'p1', gameId: 'g1', player: 'K. Irving', market: 'points', line: '24.5', odds: '-110' }] } }) } as Response)));

    const { rerender } = renderWithNervousSystem(<FrontdoorLandingClient />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Add' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    rerender(<FrontdoorLandingClient />);

    expect(await screen.findByText('K. Irving · POINTS')).toBeTruthy();
    expect(screen.getByLabelText('Edit line K. Irving')).toBeTruthy();
    expect(screen.getByLabelText('Edit odds K. Irving')).toBeTruthy();
  });

  it('renders alive strip with deterministic demo phases', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, trace_id: 'alive-demo', data: { mode: 'demo', status: 'active', games: [], board: [] } }) } as Response)));

    renderWithNervousSystem(<FrontdoorLandingClient />);

    await waitFor(() => expect(screen.getByTestId('alive-strip')).toBeTruthy());
    expect(screen.getByText('Board loaded')).toBeTruthy();
    expect(screen.getByText('Odds checked')).toBeTruthy();
    expect(screen.getByText('Injuries scanned')).toBeTruthy();
    expect(screen.getByText('Model scored')).toBeTruthy();
    expect(screen.getByText('Feeds off (demo)')).toBeTruthy();
  });

  it('run analysis href preserves nervous spine and canonical trace_id', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, trace_id: 'trace-analysis', data: { mode: 'live', status: 'active', games: [], board: [] } }) } as Response)));

    renderWithNervousSystem(<FrontdoorLandingClient />);

    const runAnalysis = await screen.findByRole('link', { name: 'Run analysis' });
    const href = runAnalysis.getAttribute('href') ?? '';
    expect(href).toContain('/stress-test?');
    expect(href).toContain('sport=NBA');
    expect(href).toContain('mode=demo');
    expect(href).toContain('tab=analyze');
    expect(href).toContain('trace_id=trace-analysis');
    expect(href).not.toContain('trace=trace-analysis');
  });

  it('renders open latest run CTA with canonical trace_id', async () => {
    window.localStorage.setItem('rb:runs:v1', JSON.stringify([{ trace_id: 'latest-trace-9', updatedAt: '2026-02-27T10:00:00.000Z', status: 'complete', slipText: '', analysis: { confidence: 0, reasons: [] }, extractedLegs: [], enrichedLegs: [] }]));
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, trace_id: 't2', data: { mode: 'live', status: 'active', games: [], board: [] } }) } as Response)));

    renderWithNervousSystem(<FrontdoorLandingClient />);
    const latest = await screen.findByRole('link', { name: 'Open latest run' });
    const href = latest.getAttribute('href') ?? '';
    expect(href).toContain('/research?');
    expect(href).toContain('trace_id=latest-trace-9');
    expect(href).not.toContain('trace=latest-trace-9');
  });

  it('renders tonight board above pipeline visualizer by default', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, trace_id: 'trace-hero', data: { mode: 'demo', status: 'active', games: [{ id: 'g1', matchup: 'DAL @ PHX', startTime: '8:00 PM' }], board: [{ id: 'p1', gameId: 'g1', player: 'K. Irving', market: 'points', line: '24.5', odds: '-110' }] } }) } as Response)));

    renderWithNervousSystem(<FrontdoorLandingClient />);

    const boardTitle = await screen.findByText("Tonight's Board");
    const pipelinePanel = screen.getByTestId('pipeline-hero-panel');
    const boardContainer = boardTitle.parentElement;
    expect(boardContainer).toBeTruthy();
    expect(boardContainer?.compareDocumentPosition(pipelinePanel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Build from Board' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Try sample slip' })).toBeTruthy();
    expect(screen.getByLabelText('Slip text')).toBeTruthy();
  });

  it('keeps pipeline visualizer collapsed by default and expands on click', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, trace_id: 'trace-collapse', data: { mode: 'demo', status: 'active', games: [{ id: 'g1', matchup: 'DAL @ PHX', startTime: '8:00 PM' }], board: [{ id: 'p1', gameId: 'g1', player: 'K. Irving', market: 'points', line: '24.5', odds: '-110' }] } }) } as Response)));

    renderWithNervousSystem(<FrontdoorLandingClient />);
    await waitFor(() => expect(screen.getByTestId('pipeline-hero-panel')).toBeTruthy());

    expect(screen.queryByText('Trace feed')).toBeNull();
    const toggle = screen.getByRole('button', { name: 'Show trace details' });
    fireEvent.click(toggle);

    expect(await screen.findByText('Trace feed')).toBeTruthy();
    expect(screen.getByText(/Trace id:/)).toBeTruthy();
    expect(screen.getByText('Weakest-leg delta impact')).toBeTruthy();
    expect(screen.getByText('Model confidence calibration')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hide trace details' })).toBeTruthy();
  });
});
