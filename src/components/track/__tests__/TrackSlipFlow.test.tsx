/** @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { NervousSystemProvider } from '@/src/components/nervous/NervousSystemContext';
import { OpenTicketsPanel } from '@/src/components/track/OpenTicketsPanel';
import { TrackSlipInput } from '@/src/components/track/TrackSlipInput';
import { listTrackedTickets } from '@/src/core/track/store';

vi.mock('@/src/features/ingest/ocr/ocrClient', () => ({
  runOcr: vi.fn(async () => 'Jayson Tatum over 29.5 points -110')
}));

function renderFlow(mode: 'demo' | 'live' = 'demo') {
  const params = new URLSearchParams({ sport: 'NBA', tz: 'America/Phoenix', date: '2026-02-26', mode });
  window.history.replaceState({}, '', `/?${params.toString()}`);
  return render(
    <NervousSystemProvider>
      <TrackSlipInput onTracked={() => undefined} onOpenDraft={() => undefined} onTrySample={async () => undefined} sampleLoading={false} />
      <OpenTicketsPanel mode={mode} />
    </NervousSystemProvider>
  );
}

describe('Track slip flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    cleanup();
  });

  it('parses pasted slip DTO and renders in Open Tickets', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          ticketId: 'ticket_1',
          createdAt: '2026-02-26T10:00:00.000Z',
          sourceHint: 'paste',
          rawSlipText: 'Jayson Tatum over 29.5 points -110',
          legs: [{ legId: 'leg-1', league: 'NBA', player: 'Jayson Tatum', marketType: 'points', threshold: 29.5, direction: 'over', source: 'fanduel' }]
        }
      })
    })));

    const flow = renderFlow('demo');

    fireEvent.change(screen.getByLabelText('Paste slip'), { target: { value: 'Jayson Tatum over 29.5 points -110' } });
    fireEvent.click(screen.getByRole('button', { name: 'Track slip' }));

    await waitFor(() => {
      expect(listTrackedTickets()).toHaveLength(1);
    });

    flow.unmount();
    render(
      <NervousSystemProvider>
        <OpenTicketsPanel mode="demo" />
      </NervousSystemProvider>
    );

    expect(screen.getByText(/Tracked ticket #1/)).toBeTruthy();
    expect(screen.getAllByText(/Jayson Tatum/).length).toBeGreaterThan(0);
  });

  it('uploads screenshot, runs OCR, and saves ticket', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          ticketId: 'ticket_upload',
          createdAt: '2026-02-26T10:00:00.000Z',
          sourceHint: 'screenshot',
          rawSlipText: 'Jayson Tatum over 29.5 points -110',
          legs: [{ legId: 'leg-1', league: 'NBA', player: 'Jayson Tatum', marketType: 'points', threshold: 29.5, direction: 'over', source: 'fanduel' }]
        }
      })
    }));
    vi.stubGlobal('fetch', fetchMock);

    renderFlow('demo');

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake'], 'slip.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(listTrackedTickets()).toHaveLength(1));
    expect(fetchMock).toHaveBeenCalledWith('/api/slips/parseText', expect.any(Object));
  });
});
