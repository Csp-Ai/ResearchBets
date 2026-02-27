import { describe, expect, it } from 'vitest';

import { buildSlateSummary } from '../slateEngine';
import { generateRankedLeads, type BoardProp } from '../leadEngine';

const baseBoard: BoardProp[] = [
  { id: 'a1', player: 'A', market: 'assists', line: '7.5', odds: '-112', hitRateL10: 72, riskTag: 'stable', gameId: 'g1' },
  { id: 'a2', player: 'B', market: 'rebounds', line: '7.5', odds: '-108', hitRateL10: 69, riskTag: 'stable', gameId: 'g1' },
  { id: 'a3', player: 'C', market: 'points', line: '27.5', odds: '+102', hitRateL10: 64, riskTag: 'watch', gameId: 'g1' },
  { id: 'a4', player: 'D', market: 'threes', line: '2.5', odds: '+120', hitRateL10: 60, riskTag: 'watch', gameId: 'g2' },
  { id: 'a5', player: 'E', market: 'assists', line: '6.5', odds: '-110', hitRateL10: 68, riskTag: 'stable', gameId: 'g2' },
  { id: 'a6', player: 'F', market: 'ra', line: '13.5', odds: '-112', hitRateL10: 67, riskTag: 'stable', gameId: 'g3' },
  { id: 'a7', player: 'G', market: 'pra', line: '35.5', odds: '+110', hitRateL10: 61, riskTag: 'watch', gameId: 'g3' },
  { id: 'a8', player: 'H', market: 'rebounds', line: '8.5', odds: '-105', hitRateL10: 65, riskTag: 'stable', gameId: 'g4' }
];

const slate = buildSlateSummary({
  mode: 'demo',
  generatedAt: '2026-01-15T19:30:00.000Z',
  leagues: ['NBA'],
  games: [
    {
      id: 'g1',
      league: 'NBA',
      status: 'live',
      startTime: '8:00 PM ET',
      matchup: 'A @ B',
      teams: ['A', 'B'],
      bookContext: 'demo',
      propsPreview: [
        { id: 'p1', player: 'A', market: 'threes', rationale: [], provenance: 'demo', lastUpdated: '2026-01-15T19:30:00.000Z' },
        { id: 'p2', player: 'B', market: 'assists', rationale: [], provenance: 'demo', lastUpdated: '2026-01-15T19:30:00.000Z' }
      ],
      provenance: 'demo',
      lastUpdated: '2026-01-15T19:30:00.000Z'
    }
  ]
});

describe('generateRankedLeads', () => {
  it('is deterministic for identical input', () => {
    const first = generateRankedLeads(baseBoard, slate, { maxLeads: 6 });
    const second = generateRankedLeads(baseBoard, slate, { maxLeads: 6 });
    expect(first).toEqual(second);
  });

  it('respects maxLeads limit', () => {
    const leads = generateRankedLeads(baseBoard, slate, { maxLeads: 5 });
    expect(leads.length).toBeLessThanOrEqual(5);
  });

  it('respects maxPerGame when possible', () => {
    const leads = generateRankedLeads(baseBoard, slate, { maxLeads: 6, maxPerGame: 2, diversifyAcrossGames: true });
    const counts = leads.reduce((acc, lead) => {
      acc.set(lead.prop.gameId, (acc.get(lead.prop.gameId) ?? 0) + 1);
      return acc;
    }, new Map<string, number>());
    expect(Array.from(counts.values()).every((count) => count <= 2)).toBe(true);
  });

  it('relaxes cap to fill remaining slots deterministically', () => {
    const sameGameBoard: BoardProp[] = [
      { id: '1', player: 'A', market: 'assists', line: '5.5', odds: '-110', hitRateL10: 75, riskTag: 'stable', gameId: 'g1' },
      { id: '2', player: 'B', market: 'rebounds', line: '6.5', odds: '-108', hitRateL10: 74, riskTag: 'stable', gameId: 'g1' },
      { id: '3', player: 'C', market: 'ra', line: '11.5', odds: '-106', hitRateL10: 73, riskTag: 'stable', gameId: 'g1' },
      { id: '4', player: 'D', market: 'points', line: '23.5', odds: '+102', hitRateL10: 65, riskTag: 'watch', gameId: 'g1' }
    ];
    const leads = generateRankedLeads(sameGameBoard, slate, { maxLeads: 3, maxPerGame: 2, diversifyAcrossGames: true });
    expect(leads).toHaveLength(3);
    const fromGame1 = leads.filter((lead) => lead.prop.gameId === 'g1').length;
    expect(fromGame1).toBe(3);
  });

  it('penalizes high volatility in reactive windows', () => {
    const nonReactive = generateRankedLeads(baseBoard, slate, { maxLeads: 8 });
    const reactive = generateRankedLeads(baseBoard, slate, { maxLeads: 8, reactive: { isReactive: true } });
    const nonReactiveHigh = nonReactive.find((lead) => lead.prop.market === 'threes');
    const reactiveHigh = reactive.find((lead) => lead.prop.market === 'threes');
    expect(nonReactiveHigh && reactiveHigh).toBeTruthy();
    expect((reactiveHigh?.convictionScore ?? 0)).toBeLessThan(nonReactiveHigh?.convictionScore ?? 0);
  });

  it('applies minConviction filter', () => {
    const leads = generateRankedLeads(baseBoard, slate, { maxLeads: 8, minConviction: 70 });
    expect(leads.every((lead) => lead.convictionScore >= 70)).toBe(true);
  });
});
