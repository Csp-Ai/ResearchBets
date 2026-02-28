/** @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

import { OpenTicketsPanel } from '@/src/components/track/OpenTicketsPanel';
import { saveTrackedTicket } from '@/src/core/track/store';

describe('OpenTicketsPanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
    cleanup();
  });

  it('renders deterministic demo tickets when there are no stored open slips', () => {
    render(<OpenTicketsPanel mode="demo" />);

    expect(screen.getByTestId('open-tickets-panel')).toBeTruthy();
    expect(screen.getByText('Open Tickets')).toBeTruthy();
    expect(screen.getByText(/Tracked ticket #1/)).toBeTruthy();
    expect(screen.getByTestId('exposure-row')).toBeTruthy();
  });

  it('keeps auto-refresh off in demo mode and on in live mode, and pauses while tab is hidden', async () => {
    saveTrackedTicket({
      ticketId: 'ticket-live',
      createdAt: '2026-02-26T10:00:00.000Z',
      sourceHint: 'paste',
      rawSlipText: 'Player over 10.5 points',
      legs: [{ legId: 'leg-1', league: 'NBA', player: 'Player', marketType: 'points', threshold: 10.5, direction: 'over', source: 'fanduel' }]
    });

    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, data: { updates: { 'leg-1': { currentValue: 6.2, liveMargin: 11, elapsedGameMinutes: 18, quarter: 2 } } } }) }));
    vi.stubGlobal('fetch', fetchMock);

    const demoPanel = render(<OpenTicketsPanel mode="demo" />);
    expect(screen.getByText(/Auto-refresh: Off/)).toBeTruthy();
    demoPanel.unmount();

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    render(<OpenTicketsPanel mode="live" />);
    await waitFor(() => expect(screen.getByText(/Auto-refresh: On/)).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });
});
