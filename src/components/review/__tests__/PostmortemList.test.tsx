/** @vitest-environment jsdom */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PostmortemList } from '@/src/components/review/PostmortemList';
import type { PostmortemRecord } from '@/src/core/review/types';

const record: PostmortemRecord = {
  ticketId: 'ticket-live-entry',
  createdAt: '2026-09-20T20:00:00.000Z',
  settledAt: '2026-09-20T23:00:00.000Z',
  status: 'lost',
  legs: [
    {
      legId: 'leg-live',
      player: 'Receiver A',
      statType: 'receiving_yards',
      target: 150,
      finalValue: 142,
      delta: -8,
      hit: false,
      missTags: ['threshold_aggression'],
      missNarrative: 'Missed the selected threshold.',
      lessonHint: 'Review the line at the time it was selected.',
    },
  ],
  coverage: { level: 'full', reasons: [] },
  fragility: { score: 58, chips: [] },
  narrative: ['Live entry context preserved.'],
  entrySnapshot: {
    capturedAt: '2026-09-20T20:05:00.000Z',
    captureSource: 'first_verified_after_tracking',
    timing: 'live',
    exactDecisionTime: false,
    note:
      'First provider-verified snapshot after ResearchBets tracking began; not asserted as sportsbook placement-time state.',
    legs: {
      'leg-live': {
        currentValue: 89,
        elapsedGameMinutes: 12,
        quarter: 2,
        timeRemainingSec: 840,
        opportunityCount: 6,
        opportunityLabel: 'targets',
      },
    },
  },
};

describe('PostmortemList entry context', () => {
  it('shows the remaining live ask and verified opportunity state only in expanded detail', () => {
    render(<PostmortemList records={[record]} />);

    expect(screen.queryByText('Entry context')).toBeNull();

    fireEvent.click(screen.getByText('Expand detail'));

    expect(screen.getByText('Entry context')).toBeTruthy();
    expect(screen.getByText('First verified after tracking')).toBeTruthy();
    expect(screen.getByText(/89\/150/)).toBeTruthy();
    expect(screen.getByText(/61 remaining/)).toBeTruthy();
    expect(screen.getByText(/Q2 14:00/)).toBeTruthy();
    expect(screen.getByText(/6 targets/)).toBeTruthy();
    expect(screen.getByText(/not asserted as sportsbook placement-time state/i)).toBeTruthy();
  });
});
