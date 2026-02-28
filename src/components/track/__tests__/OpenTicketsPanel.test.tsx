/** @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

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
      legs: [{ legId: 'leg-1', league: 'NBA', player: 'Player', marketType: 'points', threshold: 10.5, direction: 'over', source: 'fanduel', parseConfidence: 'high' }]
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

  it('shows coach panel in sweat mode and neutral copy', () => {
    saveTrackedTicket({
      ticketId: 'ticket-coach',
      createdAt: '2026-02-26T10:00:00.000Z',
      sourceHint: 'paste',
      rawSlipText: 'Player over 10.5 points',
      legs: [{ legId: 'leg-1', league: 'NBA', player: 'Player', marketType: 'points', threshold: 10.5, direction: 'over', source: 'fanduel', parseConfidence: 'high' }]
    });

    render(<OpenTicketsPanel mode="demo" />);

    expect(screen.getByTestId('during-coach-panel')).toBeTruthy();
    expect(screen.getByText('Suggested actions')).toBeTruthy();
    expect(screen.queryByText('ERROR')).toBeNull();
    expect(screen.queryByText(/panic/i)).toBeNull();
  });

  it('sweat mode off renders one-glance summary only', () => {
    saveTrackedTicket({
      ticketId: 'ticket-summary',
      createdAt: '2026-02-26T10:00:00.000Z',
      sourceHint: 'paste',
      rawSlipText: 'Player over 10.5 points',
      legs: [{ legId: 'leg-1', league: 'NBA', player: 'Player', marketType: 'points', threshold: 10.5, direction: 'over', source: 'fanduel', parseConfidence: 'high' }]
    });

    render(<OpenTicketsPanel mode="demo" />);
    fireEvent.click(screen.getByRole('button', { name: 'Hide details' }));

    expect(screen.queryByRole('button', { name: 'Expand legs' })).toBeNull();
    expect(screen.getByText(/Closest:/)).toBeTruthy();
    expect(screen.getByText(/Kill risk:/)).toBeTruthy();
    expect(screen.queryByText('Suggested actions')).toBeNull();
  });

  it('save for postmortem writes draft snapshot store', () => {
    saveTrackedTicket({
      ticketId: 'ticket-postmortem',
      createdAt: '2026-02-26T10:00:00.000Z',
      sourceHint: 'paste',
      rawSlipText: 'Player over 10.5 points',
      legs: [{ legId: 'leg-1', league: 'NBA', player: 'Player', marketType: 'assists', threshold: 5.5, direction: 'over', source: 'fanduel', parseConfidence: 'high' }]
    });

    render(<OpenTicketsPanel mode="demo" />);
    fireEvent.click(screen.getByRole('button', { name: 'Save for postmortem' }));

    const raw = window.localStorage.getItem('rb:draft-postmortems:v1');
    expect(raw).toBeTruthy();
    const records = JSON.parse(raw ?? '[]') as Array<{ ticketId: string }>;
    expect(records[0]?.ticketId).toBe('ticket-postmortem');
  });

  it('shows partial live coverage chip when game ids are missing', async () => {
    saveTrackedTicket({
      ticketId: 'ticket-coverage',
      createdAt: '2026-02-26T10:00:00.000Z',
      sourceHint: 'paste',
      rawSlipText: 'Player over 10.5 points',
      legs: [{ legId: 'leg-1', league: 'NBA', player: 'Player', marketType: 'points', threshold: 10.5, direction: 'over', source: 'fanduel', parseConfidence: 'high' }]
    });

    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, data: { updates: { 'leg-1': { currentValue: 6.2, liveMargin: 11, elapsedGameMinutes: 18, quarter: 2 } }, coverage: { 'ticket-coverage': { coverage: 'partial', legs: { 'leg-1': { coverage: 'missing', reason: 'no_game_id' } } } } } }) }));
    vi.stubGlobal('fetch', fetchMock);

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    render(<OpenTicketsPanel mode="live" />);

    await waitFor(() => expect(screen.getAllByText('Partial live coverage').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Expand legs' }));
    expect(screen.getByText('no_game_id')).toBeTruthy();
  });
});
