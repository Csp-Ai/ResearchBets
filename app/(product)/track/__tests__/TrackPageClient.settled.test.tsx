/** @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TrackPageClient } from '../TrackPageClient';
import { saveSlip } from '@/src/core/slips/storage';
import { NervousSystemProvider } from '@/src/components/nervous/NervousSystemContext';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search)
}));

vi.mock('@/src/components/track/TrackSlipInput', () => ({
  TrackSlipInput: () => <div data-testid="track-slip-input-proxy" />
}));

vi.mock('@/src/components/track/OpenTicketsPanel', () => ({
  OpenTicketsPanel: () => <div data-testid="open-tickets-panel-proxy" />
}));

vi.mock('@/src/components/track/DuringStageTracker', () => ({
  DuringStageTracker: () => <div data-testid="during-stage-tracker-proxy" />
}));

describe('TrackPageClient settled surface', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/track?slip_id=slip-after&trace_id=trace-after');
  });

  it('renders the shared AFTER command surface for a settled ticket', async () => {
    saveSlip({
      slipId: 'slip-after',
      trace_id: 'trace-after',
      createdAtIso: '2026-03-22T00:00:00.000Z',
      mode: 'demo',
      status: 'settled',
      eliminatedByLegId: 'leg-2',
      legs: [
        {
          legId: 'leg-1',
          gameId: 'g1',
          player: 'Jamal Murray',
          market: 'threes',
          line: '2.5',
          volatility: 'low',
          convictionAtBuild: 83,
          outcome: 'hit',
          currentValue: 5,
          targetValue: 2.5,
          updatedAtIso: '2026-03-22T02:00:00.000Z'
        },
        {
          legId: 'leg-2',
          gameId: 'g2',
          player: 'Aaron Gordon',
          market: 'rebounds',
          line: '6.5',
          volatility: 'high',
          convictionAtBuild: 72,
          outcome: 'miss',
          currentValue: 6,
          targetValue: 6.5,
          missType: 'variance',
          updatedAtIso: '2026-03-22T02:00:00.000Z'
        },
        {
          legId: 'leg-3',
          gameId: 'g3',
          player: 'Bench Guard',
          market: 'assists',
          line: '6.5',
          volatility: 'medium',
          convictionAtBuild: 65,
          outcome: 'push',
          currentValue: 6.5,
          targetValue: 6.5,
          updatedAtIso: '2026-03-22T02:00:00.000Z'
        }
      ]
    });

    render(
      <NervousSystemProvider>
        <TrackPageClient />
      </NervousSystemProvider>
    );

    expect(await screen.findByRole('heading', { name: /ticket closed mixed/i })).toBeTruthy();
    expect(screen.getByText('After command surface')).toBeTruthy();
    expect(screen.getByText(/Jamal Murray threes 2.5 — cleared/i)).toBeTruthy();
    expect(screen.getByText(/Aaron Gordon rebounds 6.5 — breaking leg/i)).toBeTruthy();
    expect(screen.getByText(/What to learn/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open review' }).getAttribute('href')).toContain(
      '/control?'
    );
    expect(screen.getByRole('link', { name: 'Reopen board' }).getAttribute('href')).toContain(
      '/cockpit'
    );
  });
});
