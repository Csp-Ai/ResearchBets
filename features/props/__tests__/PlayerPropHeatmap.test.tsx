import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PlayerPropHeatmap, normalizeHeatmapMarkets } from '../PlayerPropHeatmap';

describe('PlayerPropHeatmap', () => {
  it('normalizes market names', () => {
    expect(normalizeHeatmapMarkets(['POINTS', 'threes'])).toEqual(['points', 'threes']);
  });

  it('renders players and color-coded cells', () => {
    const html = renderToStaticMarkup(
      <PlayerPropHeatmap
        players={[
          {
            id: '1',
            player: 'Luka Doncic',
            team: 'DAL',
            confidence: 0.7,
            propStats: [{ marketType: 'points', last5HitRate: 0.8, seasonHitRate: 0.65, trend: 'up' }],
          },
        ]}
      />
    );

    expect(html).toContain('Luka Doncic');
    expect(html).toContain('bg-emerald-500/30');
  });
});
