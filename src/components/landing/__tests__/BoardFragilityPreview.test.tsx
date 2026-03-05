/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import type { CockpitBoardLeg } from '@/app/cockpit/adapters/todayToBoard';
import { BoardFragilityPreview } from '@/src/components/landing/BoardFragilityPreview';

const makeRow = (overrides: Partial<CockpitBoardLeg> = {}): CockpitBoardLeg => ({
  id: 'r1',
  player: 'J. Brunson',
  market: 'PTS',
  line: '26.5',
  odds: '-115',
  hitRateL10: 6,
  riskTag: 'watch',
  gameId: 'g1',
  matchup: 'NYK @ BOS',
  startTime: '7:30 PM',
  threesAttL1: 2,
  threesAttL3Avg: 6,
  attemptsSource: 'sports feed',
  ...overrides
});

describe('BoardFragilityPreview', () => {
  afterEach(() => cleanup());

  it('renders Tonight’s Most Fragile Prop when pick exists', () => {
    render(<BoardFragilityPreview rows={[makeRow()]} />);

    expect(screen.getByText("Tonight's Most Fragile Prop")).toBeTruthy();
    expect(screen.getByText('J. Brunson')).toBeTruthy();
  });

  it('does not render when no rows or pick is zero', () => {
    const { rerender } = render(<BoardFragilityPreview rows={[]} />);
    expect(screen.queryByTestId('board-fragility-preview')).toBeNull();

    rerender(
      <BoardFragilityPreview
        rows={[makeRow({
          id: 'r2',
          riskTag: 'stable',
          threesAttL1: undefined,
          threesAttL3Avg: undefined,
          fgaL1: undefined,
          fgaL3Avg: undefined
        })]}
      />
    );
    expect(screen.queryByTestId('board-fragility-preview')).toBeNull();
  });

  it('does not include placeholder strings when optional fields are missing', () => {
    render(
      <BoardFragilityPreview
        rows={[makeRow({
          id: 'r3',
          line: '—',
          odds: '—'
        })]}
      />
    );

    expect(screen.queryByText(/Unknown|N\/A/i)).toBeNull();
  });
});
