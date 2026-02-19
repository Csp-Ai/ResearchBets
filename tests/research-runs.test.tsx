// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ResearchPageContent } from '@/app/research/page';
import { runStore } from '@/src/core/run/store';
import type { Run } from '@/src/core/run/types';

const push = vi.fn();
let queryTrace: string | null = null;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => ({ get: (key: string) => (key === 'trace' || key === 'trace_id' ? queryTrace : null) })
}));

const baseRun = (traceId: string, confidencePct = 66): Run => ({
  traceId,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: 'complete',
  slipText: 'Sample slip',
  extractedLegs: [{ id: 'leg-1', selection: 'Leg one', market: 'points', odds: '-110' }],
  enrichedLegs: [{ extractedLegId: 'leg-1', l5: 58, l10: 61, season: 57, vsOpp: 55, flags: { injury: null, news: null, lineMove: null, divergence: null }, evidenceNotes: ['ok'] }],
  analysis: { confidencePct, weakestLegId: 'leg-1', reasons: ['Leg one is under pressure.'], riskLabel: 'Caution', computedAt: new Date().toISOString() },
  sources: { stats: 'live', injuries: 'fallback', odds: 'fallback' }
});

describe('research run rendering and reload', () => {
  beforeEach(async () => {
    queryTrace = null;
    push.mockReset();
    window.localStorage.clear();
    await runStore.saveRun(baseRun('trace-a', 67));
    await runStore.saveRun(baseRun('trace-b', 72));
  });

  it('renders verdict for a stored run by trace', async () => {
    queryTrace = 'trace-a';
    render(<ResearchPageContent />);

    await waitFor(() => {
      expect(screen.getByTestId('verdict-hero')).toBeTruthy();
      expect(screen.getByText('67%')).toBeTruthy();
    });
  });

  it('recent activity open loads selected trace', async () => {
    render(<ResearchPageContent />);

    await waitFor(() => expect(screen.getAllByTestId('recent-activity-panel').length).toBeGreaterThan(0));
    const openButtons = screen.getAllByText('Open');
    fireEvent.click(openButtons[0] as HTMLElement);

    expect(push).toHaveBeenCalledWith(expect.stringContaining('/research?trace='));
  });


  it('recent activity reflects persisted complete status', async () => {
    render(<ResearchPageContent />);

    await waitFor(() => expect(screen.getByText(/complete/)).toBeTruthy());
  });

});
