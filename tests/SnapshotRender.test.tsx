import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SnapshotReplayView } from '../features/snapshot/SnapshotReplayView';
import { extractLegs } from '../src/core/slips/extract';

describe('SnapshotReplayView', () => {
  it('renders each leg label, insight tags, and trend section', () => {
    const html = renderToStaticMarkup(
      <SnapshotReplayView
        legs={[
          {
            selection: 'Jayson Tatum Over 29.5',
            market: 'points',
            team: 'BOS',
            gameId: 'NBA:BOS@LAL'
          },
          {
            selection: 'LeBron James Over 8.5 AST',
            market: 'assists',
            team: 'LAL',
            gameId: 'NBA:BOS@LAL'
          }
        ]}
        legHitProfiles={[{
          selection: 'Jayson Tatum Over 29.5',
          marketType: 'points',
          hitRate: { l5: 80, l10: 70, seasonAvg: 28.1, vsOpponent: 26.3 },
          lineContext: {
            platformLines: [],
            consensusLine: 29.5,
            divergence: { spread: 1.5, warning: true }
          },
          verdict: { score: 74, label: 'Strong', riskTag: 'Medium' },
          provenance: { asOf: '2024-01-01T00:00:00.000Z', sources: [] }
        }]}
        traceId="trace_123"
        snapshotId="snapshot_123"
        replayEnabled
      />
    );

    expect(html).toContain('Jayson Tatum Over 29.5');
    expect(html).toContain('LeBron James Over 8.5 AST');
    expect(html).toContain('Snapshot Replay');
    expect(html).toContain('Hit Profile');
    expect(html).toContain('Line Context');
    expect(html).toContain('Parlay style');
    expect(html).toContain('Open replay graph for trace trace_123');
  });

  it('parses mixed marketType legs and keeps normalized values', () => {
    const legs = extractLegs(
      JSON.stringify([
        { selection: 'Nikola Jokic Over 28.5', market: 'Points', odds: '-110' },
        { selection: 'Jalen Brunson Over 8.5 AST', market: 'assists', odds: '-115' },
        { selection: 'Donte DiVincenzo Over 2.5 3PM', market: 'threes', odds: '+125' }
      ])
    );

    expect(legs).toHaveLength(3);
    expect(legs.map((leg) => leg.market)).toEqual(['points', 'assists', 'threes']);
  });
});
