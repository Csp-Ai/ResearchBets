import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GamesToday, mapPropToLeg } from '../GamesToday';

describe('GamesToday', () => {
  it('maps prop to slip leg with confidence and volatility', () => {
    const leg = mapPropToLeg('Luka Doncic', { market: 'points', line: '30.5', odds: '-110' });
    expect(leg.player).toBe('Luka Doncic');
    expect(leg.confidence).toBeGreaterThan(0);
  });

  it('renders games and prop buttons', () => {
    const html = renderToStaticMarkup(
      <GamesToday
        games={[
          {
            id: '1',
            league: 'NBA',
            matchup: 'LAL @ DAL',
            teams: [{ team: 'LAL', players: [{ id: 'p1', name: 'LeBron James', injuryStatus: 'Active', matchupNotes: 'pace up', props: [{ market: 'points', line: '25.5' }] }] }],
          },
        ]}
        onAddLeg={() => undefined}
      />
    );

    expect(html).toContain('LAL @ DAL');
    expect(html).toContain('points 25.5');
    expect(html).toContain('Click a prop chip to add to slip');
  });
});
