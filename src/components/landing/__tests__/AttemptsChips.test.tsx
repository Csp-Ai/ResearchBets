/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { AttemptsChips } from '@/src/components/landing/AttemptsChips';

describe('AttemptsChips', () => {
  it('renders 3PA chips for threes market rows', () => {
    render(
      <AttemptsChips
        leg={{
          id: 'p1',
          player: 'J. Tatum',
          market: 'threes',
          line: '2.5',
          odds: '-110',
          hitRateL10: null,
          riskTag: 'stable',
          gameId: 'g1',
          matchup: 'LAL @ BOS',
          startTime: '8:00 PM',
          threesAttL1: 7,
          threesAttL3Avg: 6.2,
          threesAttL5Avg: 6.6,
          attemptsSource: 'sportsdataio'
        }}
      />
    );

    expect(screen.getByText('3PA L1 7.0')).toBeTruthy();
    expect(screen.getByText('3PA L3 6.2')).toBeTruthy();
    expect(screen.getByText('3PA: sportsdataio')).toBeTruthy();
  });
});
