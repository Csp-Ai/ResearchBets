// @vitest-environment jsdom

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import IngestionPage from '@/app/ingest/page';
import { renderWithProviders } from '@/src/test-utils/renderWithProviders';

const push = vi.fn();
let queryTrace = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: push }),
  useSearchParams: () => ({ get: (key: string) => (key === 'trace_id' || key === 'trace' ? queryTrace : null) })
}));

vi.mock('@/src/core/pipeline/runSlip', () => ({
  computeLegRisk: vi.fn(() => ({ riskScore: 12, riskBand: 'moderate', factors: ['Line moved 1.0'] })),
  runSlip: vi.fn(async () => 'trace-smoke-ivan')
}));

describe('smoke: ingest to research workflow', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    push.mockReset();
    queryTrace = '';
    window.localStorage.clear();
  });

  it('routes ingest workflow using canonical trace_id', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/api/slips/submit')) {
        return new Response(JSON.stringify({ ok: true, data: { slip_id: '00000000-0000-0000-0000-000000000001', trace_id: 'trace-smoke-ivan', anon_id: 'anon-1', spine: { trace_id: 'trace-smoke-ivan' }, trace: { trace_id: 'trace-smoke-ivan', mode: 'demo' }, parse: { confidence: 0.6, legs_count: 1, needs_review: false } }, trace_id: 'trace-smoke-ivan' }), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    }));

    renderWithProviders(<IngestionPage />);

    fireEvent.change(screen.getByPlaceholderText('Paste each leg on a new line'), {
      target: { value: 'Jayson Tatum over 29.5 points (-110)' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save slip' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Analyze now' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Analyze now' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/research')));
    expect(push).toHaveBeenCalledWith(expect.stringContaining('trace_id=trace-smoke-ivan'));
  });
});
