// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import IngestionPage from '@/app/(product)/ingest/page';
import { renderWithProviders } from '@/src/test-utils/renderWithProviders';
import { DraftSlipStore } from '@/src/core/slips/draftSlipStore';
import { draftSlipToTrackedTicket } from '@/src/core/track/fromDraftSlip';

const push = vi.fn();
let queryTrace = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: push }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'trace_id' || key === 'trace' ? queryTrace : null)
  })
}));

vi.mock('@/src/core/pipeline/runSlip', () => ({
  computeLegRisk: vi.fn(() => ({
    riskScore: 12,
    riskBand: 'moderate',
    factors: ['Line moved 1.0']
  })),
  runSlip: vi.fn(async () => 'trace-smoke-ivan')
}));

describe('smoke: ingest to research workflow', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    push.mockReset();
    queryTrace = '';
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('keeps unreadable text out of X-Ray', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => new Response(JSON.stringify(
      String(input).includes('/api/slips/submit')
        ? { ok: true, trace_id: 'trace-review', data: { slip_id: '00000000-0000-0000-0000-000000000002', trace_id: 'trace-review', anon_id: 'anon-1', spine: { trace_id: 'trace-review' }, trace: { trace_id: 'trace-review', mode: 'demo' }, parse: { confidence: 0, legs_count: 0, needs_review: true } } }
        : { ok: true, data: { legs: [{ player: 'Needs review', needsReview: true, parseConfidence: 'low' }] } }
    ), { status: 200 })));
    renderWithProviders(<IngestionPage />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Unreadable screenshot text' } });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze ticket' }));
    expect(await screen.findByText(/Some legs could not be read reliably/)).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
    expect(DraftSlipStore.getState().legs).toEqual([]);
  });

  it('routes ingest workflow using canonical trace_id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes('/api/slips/submit')) {
          return new Response(
            JSON.stringify({
              ok: true,
              data: {
                slip_id: '00000000-0000-0000-0000-000000000001',
                trace_id: 'trace-smoke-ivan',
                anon_id: 'anon-1',
                spine: { trace_id: 'trace-smoke-ivan' },
                trace: { trace_id: 'trace-smoke-ivan', mode: 'demo' },
                parse: { confidence: 0.6, legs_count: 1, needs_review: false }
              },
              trace_id: 'trace-smoke-ivan'
            }),
            { status: 200 }
          );
        }
        if (String(input).includes('/api/slips/parseText')) {
          return new Response(
            JSON.stringify({
              ok: true,
              data: {
                ticketId: 'ticket-1',
                createdAt: '2026-09-16T00:00:00.000Z',
                rawSlipText: 'Jayson Tatum over 29.5 points (-110)',
                sourceHint: 'paste',
                legs: [{
                  legId: 'leg-1',
                  league: 'NBA',
                  player: 'Jayson Tatum',
                  marketType: 'points',
                  threshold: 29.5,
                  direction: 'over',
                  odds: '-110',
                  source: 'paste',
                  parseConfidence: 'high',
                }],
              },
            }),
            { status: 200 }
          );
        }
        return new Response(JSON.stringify({}), { status: 200 });
      })
    );

    renderWithProviders(<IngestionPage />);

    fireEvent.change(screen.getByPlaceholderText(/paste each leg on a new line/i), {
      target: { value: 'Jayson Tatum over 29.5 points (-110)' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze ticket' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/stress-test')));
    expect(push).toHaveBeenCalledWith(expect.stringContaining('trace_id=trace-smoke-ivan'));
    const draft = DraftSlipStore.getState();
    expect(draft).toMatchObject({ slip_id: '00000000-0000-0000-0000-000000000001', trace_id: 'trace-smoke-ivan' });
    const tracked = draftSlipToTrackedTicket({ draft, spine: { sport: 'NBA', date: '2026-09-16', tz: 'UTC', mode: 'live' } });
    expect(tracked.slip_id).toBe(draft.slip_id);
    expect(tracked.trace_id).toBe(draft.trace_id);
  });
});
