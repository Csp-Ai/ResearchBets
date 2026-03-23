/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { SlipIntelBar } from '@/src/components/slips/SlipIntelBar';

describe('SlipIntelBar', () => {
  it('renders risk panel when at least two legs exist', () => {
    render(
      <SlipIntelBar
        legs={[
          {
            id: 'a',
            player: 'Luka Doncic',
            market: 'assists',
            line: '9.5',
            odds: '-105',
            game: 'LAL @ DAL',
            selection: 'Luka over 9.5 assists'
          },
          {
            id: 'b',
            player: 'LeBron James',
            market: 'points',
            line: '30.5',
            odds: '+120',
            game: 'LAL @ DAL',
            selection: 'LeBron over 30.5 points'
          }
        ]}
      />
    );

    expect(screen.getByTestId('slip-risk-panel')).toBeTruthy();
    expect(screen.getByText(/supporting readout/i)).toBeTruthy();
    expect(screen.getByText(/signal/i)).toBeTruthy();
    expect(screen.getByText(/next step/i)).toBeTruthy();
    expect(screen.getByText(/support behind the read is still thin/i)).toBeTruthy();
  });

  it('never renders n/a text in risk panel output', () => {
    render(
      <SlipIntelBar
        legs={[
          {
            id: 'a',
            market: 'points',
            line: '20.5',
            odds: '-110',
            selection: 'Player over 20.5 points'
          },
          {
            id: 'b',
            market: 'rebounds',
            line: '8.5',
            odds: '-108',
            selection: 'Player over 8.5 rebounds'
          }
        ]}
      />
    );

    expect(screen.queryByText(/n\/a/i)).toBeNull();
  });
});
