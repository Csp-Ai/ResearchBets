/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

import { SlipIntelBar } from '@/src/components/slips/SlipIntelBar';
import AnalyzeTabPanel from '@/src/components/research/AnalyzeTabPanel';
import { FrontdoorLandingClient } from '@/src/components/landing/FrontdoorLandingClient';
import { renderWithNervousSystem } from '@/src/test-utils/renderWithNervousSystem';

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return { ...actual, useRouter: () => ({ push: vi.fn() }) };
});

vi.mock('@/src/hooks/useDraftSlip', () => ({
  useDraftSlip: () => ({ slip: [], addLeg: vi.fn(), removeLeg: vi.fn(), getSlip: vi.fn(), updateLeg: vi.fn(), setSlip: vi.fn(), clearSlip: vi.fn() })
}));

const bad = ['n/a', 'Waiting for events', 'No upcoming slates', '[object Object]', 'undefined'];

describe('shareable terminal copy invariants', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
  it('keeps first-fold touched surfaces free of broken placeholder strings', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, trace_id: 't-safe', data: { mode: 'demo', status: 'active', games: [{ id: 'g1', matchup: 'NYK @ IND', startTime: '7:00 PM' }], board: [{ id: 'p1', gameId: 'g1', player: 'Player 1', market: 'points', line: '20.5', odds: '-110', hitRateL10: 63, hitRateL5: 40, riskTag: 'watch' }] } }) })));

    const { container, unmount } = renderWithNervousSystem(<FrontdoorLandingClient />);
    await waitFor(() => expect(screen.getByTestId('board-section')).toBeTruthy());

    render(<SlipIntelBar legs={[{ id: 'a', selection: 'A over 20.5 points', market: 'points', odds: '-110' }, { id: 'b', selection: 'B over 5.5 assists', market: 'assists', odds: '-110' }]} />);
    render(
      <AnalyzeTabPanel
        intelLegs={[{ id: '1', selection: 'A over', market: 'points', odds: '-110' }, { id: '2', selection: 'B over', market: 'rebounds', odds: '-108' }]}
        legs={[{ id: '1', selection: 'A over', l5: 50, l10: 60, risk: 'caution' }]}
        sortedLegs={[]}
        weakestLeg={null}
        runDto={null}
        currentRun={null}
        prefillKeyFromQuery=""
        copyStatus="idle"
        copySlipStatus="idle"
        onPasteOpen={vi.fn()}
        onTryExample={vi.fn()}
        onCopyReasons={vi.fn()}
        onCopySlip={vi.fn()}
        slipHref="/slip"
        demoSlip={'A over\nB over'}
      />
    );

    const allText = container.textContent + ' ' + document.body.textContent;
    for (const token of bad) {
      expect(allText.toLowerCase()).not.toContain(token.toLowerCase());
    }

    unmount();
  });
});
