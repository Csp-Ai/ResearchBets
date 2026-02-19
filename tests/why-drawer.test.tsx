// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LegRankList } from '@/src/components/bettor/BettorFirstBlocks';

describe('Why drawer', () => {
  it('opens and shows provenance chips', () => {
    render(
      <LegRankList
        legs={[{
          id: 'leg-1',
          selection: 'Luka Doncic over 8.5 assists',
          market: 'assists',
          line: '8.5',
          odds: '-120',
          l5: 54,
          l10: 58,
          season: 59,
          vsOpp: 56,
          risk: 'weak',
          riskFactors: ['L5 downside 46%', 'Books disagree (0.5)'],
          dataSources: { stats: 'live', injuries: 'fallback', odds: 'fallback' },
          divergence: true
        }]}
        onRemove={() => {}}
      />
    );

    fireEvent.click(screen.getByText('Why'));

    expect(screen.getByTestId('why-drawer')).toBeTruthy();
    expect(screen.getByText('Provider provenance')).toBeTruthy();
    expect(screen.getByText('Stats: live')).toBeTruthy();
    expect(screen.getByText('Injuries: fallback')).toBeTruthy();
  });
});
