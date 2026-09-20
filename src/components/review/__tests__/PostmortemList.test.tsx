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

    const context = screen.getByTestId('entry-context-ticket-live-entry');
    expect(context.textContent).toContain('Entry context');
    expect(context.textContent).toContain('First verified after tracking');
    expect(context.textContent).toContain('89/150');
    expect(context.textContent).toContain('61 remaining');
    expect(context.textContent).toContain('Q2 14:00');
    expect(context.textContent).toContain('6 targets');
    expect(context.textContent).toMatch(/not asserted as sportsbook placement-time state/i);
  });
});
