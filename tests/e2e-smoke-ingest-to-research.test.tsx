// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import IngestionPage from '@/app/(product)/ingest/page';
import { renderWithProviders } from '@/src/test-utils/renderWithProviders';
import { DraftSlipStore } from '@/src/core/slips/draftSlipStore';
import { draftSlipToTrackedTicket } from '@/src/core/track/fromDraftSlip';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: push }),
  useSearchParams: () => ({ get: () => null })
}));
vi.mock('@/src/core/pipeline/runSlip', () => ({
  computeLegRisk: vi.fn(() => ({ riskScore: 12, riskBand: 'moderate', factors: ['Line moved 1.0'] })),
  runSlip: vi.fn(async () => 'trace-smoke-ivan')
}));

const validLeg = {
  legId: 'leg-1', league: 'NBA', player: 'Jayson Tatum', marketType: 'points',
  marketLabel: 'Points', threshold: 29.5, direction: 'over', odds: '-110',
  source: 'paste', parseConfidence: 'high', rawText: 'Jayson Tatum over 29.5 points (-110)'
};

describe('smoke: screenshot/paste review to X-Ray', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
  beforeEach(() => {
    push.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('keeps unknown or unreadable text out of X-Ray', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      data: {
        ticketId: 'unreadable', legs: [{
          ...validLeg, league: 'Unknown', player: 'Needs review',
          marketLabel: 'Needs review', needsReview: true, parseConfidence: 'low'
        }]
      }
    }), { status: 200 })));
    renderWithProviders(<IngestionPage />);
    fireEvent.change(screen.getByPlaceholderText(/paste each leg on a new line/i), {
      target: { value: 'Unreadable screenshot text' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Review extracted ticket' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Analyze My Ticket' })).toBeTruthy());
    expect(screen.getByRole('checkbox', { name: /Confirm leg 1/ })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: 'Analyze My Ticket' }));
    expect(await screen.findByText(/Review every leg before analysis/)).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
    expect(DraftSlipStore.getState().legs).toEqual([]);
  });

  it('requires explicit leg confirmation and preserves ticket identity', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      data: {
        ticketId: 'ticket-1', rawSlipText: validLeg.rawText, sourceHint: 'paste',
        createdAt: '2026-11-21T00:00:00.000Z', legs: [validLeg]
      }
    }), { status: 200 })));
    renderWithProviders(<IngestionPage />);
    fireEvent.change(screen.getByPlaceholderText(/paste each leg on a new line/i), {
      target: { value: 'FanDuel Sportsbook\n' + validLeg.rawText }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Review extracted ticket' }));
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /Confirm leg 1/ })).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
    expect((screen.getByLabelText(/Sportsbook \(OCR suggestion: FanDuel/) as HTMLSelectElement).value).toBe('FanDuel');
    fireEvent.change(screen.getByLabelText(/Sportsbook \(OCR suggestion: FanDuel/), {target: {value:'DraftKings'}});
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirm leg 1/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Analyze My Ticket' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/stress-test')));
    const draft = DraftSlipStore.getState();
    expect(draft.slip_id).toBeTruthy();
    expect(draft.trace_id).toBeTruthy();
    expect(draft.ingestion?.userTicketStatus).toBe('proposed');
    expect(draft.ingestion?.observedSportsbook).toBe('FanDuel');
    expect(draft.ingestion?.userSelectedSportsbook).toBe('DraftKings');
    expect(draft.ingestion?.origin).toBe('paste');
    expect(draft.ingestion?.parsedCandidate).toHaveLength(1);
    expect(draft.legs[0]?.player).toBe('Jayson Tatum');
    const tracked = draftSlipToTrackedTicket({
      draft, spine: { sport: 'NBA', date: '2026-11-21', tz: 'UTC', mode: 'live' }
    });
    expect(tracked.slip_id).toBe(draft.slip_id);
    expect(tracked.trace_id).toBe(draft.trace_id);
    expect(tracked.sourceHint).toBe('paste');
    expect(tracked.provenance?.source_type).toBe('parser_derived');
    expect(tracked.provenance?.review_state).toBe('reviewed');
    expect(tracked.legs[0]?.source).toBe('paste_reviewed');
    expect(tracked.legs[0]?.league).toBe('NBA');
    expect(vi.mocked(fetch).mock.calls.some(([input]) => String(input).includes('/api/slips/submit'))).toBe(false);
  });
});
