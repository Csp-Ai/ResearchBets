// @vitest-environment jsdom

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import IngestionPage from '@/app/(product)/ingest/page';
import { renderWithProviders } from '@/src/test-utils/renderWithProviders';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => ({ get: () => null })
}));
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(async (_lang: string, _oem: number, options: { logger?: (input: { status: string; progress: number }) => void }) => ({
    recognize: vi.fn(async () => {
      options.logger?.({ status: 'recognizing text', progress: 0.42 });
      return { data: { text: 'Leg A over 22.5 points\nLeg B over 5.5 assists' } };
    }),
    terminate: vi.fn(async () => undefined)
  }))
}));

describe('screenshot-first ResearchBets ingestion', () => {
  beforeEach(() => {
    push.mockReset();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      data: {
        ticketId: 'candidate-one',
        sourceHint: 'screenshot',
        rawSlipText: 'Leg A over 22.5 points',
        createdAt: '2026-11-21T00:00:00.000Z',
        legs: [{
          legId: 'leg-1', league: 'Unknown', player: 'Leg A', marketType: 'points',
          marketLabel: 'Points', threshold: 22.5, direction: 'over', source: 'screenshot',
          parseConfidence: 'high', needsReview: true, rawText: 'Leg A over 22.5 points'
        }]
      }
    }), { status: 200 })));
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('presents screenshot-first upload and manual-paste alternatives', () => {
    renderWithProviders(<IngestionPage />);
    expect(screen.getByRole('button', { name: 'Upload Your Parlay' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Take a picture' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Review extracted ticket' })).toBeTruthy();
  });

  it('extracts locally without uploading the original unless opted in', async () => {
    renderWithProviders(<IngestionPage />);
    const input = document.querySelector('input[type="file"][multiple]') as HTMLInputElement;
    const file = new File(['dummy'], 'slip.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByDisplayValue(/Leg A over 22.5 points/)).toBeTruthy());
    await waitFor(() => expect(screen.getByText(/Your Ticket · 1 legs/)).toBeTruthy());
    expect(screen.getByRole('checkbox', { name: /Confirm leg 1/ })).toHaveProperty('disabled', true);
    const calls = vi.mocked(fetch).mock.calls.map(([input]) => String(input));
    expect(calls.some((path) => path.includes('/api/bettor-memory/upload'))).toBe(false);
    expect(calls.some((path) => path.includes('/api/slips/parseText'))).toBe(true);
    expect(push).not.toHaveBeenCalled();
  });
});
