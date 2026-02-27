// @vitest-environment jsdom

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ResearchPageContent from '@/src/components/research/ResearchPageContent';
import { runStore } from '@/src/core/run/store';
import type { Run } from '@/src/core/run/types';
import { renderWithProviders } from '@/src/test-utils/renderWithProviders';

const push = vi.fn();
let queryTrace = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: push }),
  useSearchParams: () => ({ get: (key: string) => (key === 'trace_id' || key === 'trace' ? queryTrace : null) })
}));

const baseRun = (traceId: string, confidencePct = 66): Run => ({
  trace_id: traceId,
  traceId,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: 'complete',
  slipText: 'Leg A\nLeg B',
  extractedLegs: [{ id: 'leg-1', selection: 'Leg A over 10.5 points', market: 'points', odds: '-110' }],
  enrichedLegs: [{ extractedLegId: 'leg-1', l5: 62, l10: 64, flags: {}, evidenceNotes: ['steady form'] }],
  analysis: { confidencePct, weakestLegId: 'leg-1', reasons: ['Highest downside: Leg A over 10.5 points'], riskLabel: 'Caution', computedAt: new Date().toISOString() },
  sources: { stats: 'fallback', injuries: 'fallback', odds: 'fallback' }
});

describe('research run rendering and reload', () => {
  beforeEach(async () => {
    push.mockReset();
    queryTrace = '';
    window.localStorage.clear();
    await runStore.saveRun(baseRun('trace-a', 67));
    await runStore.saveRun(baseRun('trace-b', 72));
  });

  it('renders verdict for a stored run by trace', async () => {
    queryTrace = 'trace-a';
    renderWithProviders(<ResearchPageContent />);

    await waitFor(() => {
      expect(screen.getByText('Stress Test')).toBeTruthy();
      expect(screen.getByText(/trace_id:/i)).toBeTruthy();
    });
  });

  it('recent activity open loads selected trace', async () => {
    renderWithProviders(<ResearchPageContent />);

    const openButtons = await waitFor(() => screen.getAllByText('Open'));
    fireEvent.click(openButtons[0] as HTMLElement);

    expect(push).toHaveBeenCalledWith(expect.stringContaining('/stress-test'));
    expect(push).toHaveBeenCalledWith(expect.stringContaining('trace_id=trace-b'));
  });
});
