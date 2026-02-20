// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import IngestionPage from '@/app/ingest/page';
import ResearchPageContent from '@/src/components/research/ResearchPageContent';
import { runStore } from '@/src/core/run/store';
import type { Run } from '@/src/core/run/types';

const push = vi.fn();
let queryTrace: string | null = null;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => ({ get: (key: string) => (key === 'trace' || key === 'trace_id' ? queryTrace : null) })
}));

vi.mock('@/src/core/pipeline/runSlip', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/core/pipeline/runSlip')>();
  return {
    ...actual,
    runSlip: vi.fn(async () => 'trace-smoke-ivan')
  };
});

describe('smoke: ingest to research workflow', () => {
  beforeEach(() => {
    queryTrace = null;
    push.mockReset();
    window.localStorage.clear();
  });

  it('routes analyze from ingest to research and renders verdict + share reply', async () => {
    render(<IngestionPage />);

    fireEvent.change(screen.getByPlaceholderText('Paste each leg on a new line'), {
      target: { value: 'Jayson Tatum over 29.5 points (-110)' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Analyze now' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/research?trace=trace-smoke-ivan'));

    const run: Run = {
      traceId: 'trace-smoke-ivan',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'complete',
      slipText: 'Jayson Tatum over 29.5 points (-110)',
      extractedLegs: [{ id: 'leg-1', selection: 'Jayson Tatum over 29.5 points', market: 'points', odds: '-110' }],
      enrichedLegs: [{ extractedLegId: 'leg-1', l5: 58, l10: 61, season: 57, vsOpp: 55, flags: { injury: null, news: null, lineMove: null, divergence: null }, evidenceNotes: ['ok'] }],
      analysis: { confidencePct: 68, weakestLegId: 'leg-1', reasons: ['Leg one is under pressure.'], riskLabel: 'Caution', computedAt: new Date().toISOString() },
      sources: { stats: 'live', injuries: 'fallback', odds: 'fallback' },
      trustedContext: {
        asOf: new Date().toISOString(),
        items: [{ kind: 'status', headline: 'No verified status changes.', confidence: 'verified', asOf: new Date().toISOString(), subject: { sport: 'nba', player: 'Jayson Tatum' }, sources: [] }],
        coverage: { injuries: 'fallback', transactions: 'fallback', odds: 'fallback', schedule: 'computed' },
        unverifiedItems: [{ kind: 'injury', headline: 'Crowd says minor knock (unverified).', confidence: 'unknown', asOf: new Date().toISOString(), subject: { sport: 'nba', player: 'Jayson Tatum' }, sources: [], trust: 'unverified' }]
      }
    };

    await runStore.saveRun(run);

    queryTrace = 'trace-smoke-ivan';
    render(<ResearchPageContent />);

    await waitFor(() => {
      expect(screen.getByTestId('verdict-hero')).toBeTruthy();
      expect(screen.getByText('Reply to group chat')).toBeTruthy();
    });
  });
});
