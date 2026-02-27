/** @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';

import { FrontdoorLandingClient } from '@/src/components/landing/FrontdoorLandingClient';
import { renderWithNervousSystem } from '@/src/test-utils/renderWithNervousSystem';

const routerPush = vi.fn();

let slipState: Array<{ id: string; player: string; marketType: string; line: string; odds: string; game?: string }> = [];
const addLeg = vi.fn((leg) => { if (!slipState.some((item) => item.id === leg.id)) slipState.push(leg); });
const removeLeg = vi.fn((legId: string) => { slipState = slipState.filter((leg) => leg.id !== legId); });

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return { ...actual, useRouter: () => ({ push: routerPush }) };
});

vi.mock('@/src/hooks/useDraftSlip', () => ({
  useDraftSlip: () => ({ slip: slipState, addLeg, removeLeg, getSlip: vi.fn(), updateLeg: vi.fn(), setSlip: vi.fn(), clearSlip: vi.fn() })
}));

describe('FrontdoorLandingClient live modes', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    slipState = [];
    window.localStorage.clear();
  });

  it('renders alive-in-5s board surface with scout cards and neutral mode chip copy', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, trace_id: 't1', data: { mode: 'demo', status: 'active', games: [{ id: 'g1', matchup: 'NYK @ IND', startTime: '7:00 PM' }], board: [{ id: 'p1', gameId: 'g1', player: 'Player 1', market: 'points', line: '20.5', odds: '-110', hitRateL10: 63, hitRateL5: 40, marketImpliedProb: 51, modelProb: 61, edgeDelta: 10, riskTag: 'watch' }] } }) })));    
    renderWithNervousSystem(<FrontdoorLandingClient />);

    await waitFor(() => expect(screen.getByTestId('board-section')).toBeTruthy());
    expect(screen.getByTestId('scout-cards-panel')).toBeTruthy();
    expect(screen.getByText("Tonight's Board")).toBeTruthy();
    expect(screen.getByText('Demo mode (live feeds off)')).toBeTruthy();
  });

  it('renders open latest run CTA with canonical trace_id', async () => {
    window.localStorage.setItem('rb:runs:v1', JSON.stringify([{ trace_id: 'latest-trace-9', updatedAt: '2026-02-27T10:00:00.000Z', status: 'complete', slipText: '', analysis: { confidence: 0, reasons: [] }, extractedLegs: [], enrichedLegs: [] }]));
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, trace_id: 't2', data: { mode: 'live', status: 'active', games: [], board: [] } }) })));

    renderWithNervousSystem(<FrontdoorLandingClient />);
    const latest = await screen.findByRole('link', { name: 'Open latest run' });
    const href = latest.getAttribute('href') ?? '';
    expect(href).toContain('/research?');
    expect(href).toContain('trace_id=latest-trace-9');
    expect(href).not.toContain('trace=latest-trace-9');
  });

  it('keeps tracker continuity on one trace_id across before/during/after', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const href = String(input);
      if (href.includes('/api/today')) {
        return { ok: true, json: async () => ({ ok: true, trace_id: 'trace-session-1', data: { mode: 'demo', status: 'active', games: [], board: [] } }) } as Response;
      }
      return { ok: true, json: async () => ({ ok: true, events: [] }) } as Response;
    }));

    renderWithNervousSystem(<FrontdoorLandingClient />);
    await waitFor(() => expect(screen.getByTestId('landing-run-tracker')).toBeTruthy());

    const tracker = screen.getByTestId('landing-run-tracker');
    expect(tracker.textContent).toContain('trace_id trace-sessio');
    expect(screen.getByText(/BEFORE · Slip ready/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));
    expect(screen.getByText(/DURING · Analyzing/)).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/AFTER · Verdict ready/)).toBeTruthy(), { timeout: 3000 });
    expect(tracker.textContent).toContain('trace_id trace-sessio');
  });

  it('preserves spine and trace_id in scout CTA hrefs', async () => {
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
