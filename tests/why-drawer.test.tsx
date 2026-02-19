// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { LegRankList } from '@/src/components/bettor/BettorFirstBlocks';

describe('Why drawer', () => {
  afterEach(() => cleanup());

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
        trustedContext={{
          asOf: '2025-01-01T15:12:00.000Z',
          coverage: { injuries: 'live', transactions: 'none', odds: 'none', schedule: 'computed' },
          items: [{
            kind: 'status',
            subject: { sport: 'nba', team: 'Dallas' },
            headline: 'Luka probable',
            confidence: 'verified',
            asOf: '2025-01-01T15:12:00.000Z',
            sources: [{ provider: 'sportsdataio', label: 'SportsDataIO NBA Injuries', retrievedAt: '2025-01-01T15:12:00.000Z' }]
          }]
        }}
        onRemove={() => {}}
      />
    );

    fireEvent.click(screen.getAllByText('Why')[0]!);

    expect(screen.getByTestId('why-drawer')).toBeTruthy();
    expect(screen.getByText('Provider provenance')).toBeTruthy();
    expect(screen.getByText('Stats: live')).toBeTruthy();
    expect(screen.getByText('Injuries: fallback')).toBeTruthy();
    expect(screen.getByText('Trusted context')).toBeTruthy();
    expect(screen.getByText('Luka probable')).toBeTruthy();
  });

  it('renders no verified message when trusted context is empty', () => {
    render(
      <LegRankList
        legs={[{
          id: 'leg-1',
          selection: 'Luka Doncic over 8.5 assists',
          l5: 54,
          l10: 58,
          risk: 'weak'
        }]}
        trustedContext={{
          asOf: '2025-01-01T15:12:00.000Z',
          coverage: { injuries: 'none', transactions: 'none', odds: 'none', schedule: 'none' },
          items: [],
          fallbackReason: 'No verified update from trusted sources.'
        }}
        onRemove={() => {}}
      />
    );

    fireEvent.click(screen.getAllByText('Why')[0]!);
    expect(screen.getByText('No verified update from trusted sources.')).toBeTruthy();
  });
});
