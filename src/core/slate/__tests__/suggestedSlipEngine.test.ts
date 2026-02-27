import { describe, expect, it } from 'vitest';

import { buildSlateSummary } from '../slateEngine';
import { generateSuggestedSlips, type BoardProp } from '../suggestedSlipEngine';

const board: BoardProp[] = [
  { id: '1', player: 'A', market: 'assists', line: '6.5', odds: '-110', hitRateL10: 68, riskTag: 'stable', gameId: 'g1' },
  { id: '2', player: 'B', market: 'rebounds', line: '8.5', odds: '-108', hitRateL10: 65, riskTag: 'stable', gameId: 'g1' },
  { id: '3', player: 'C', market: 'points', line: '22.5', odds: '+102', hitRateL10: 59, riskTag: 'watch', gameId: 'g2' },
  { id: '4', player: 'D', market: 'threes', line: '2.5', odds: '+120', hitRateL10: 57, riskTag: 'watch', gameId: 'g2' },
  { id: '5', player: 'E', market: 'ra', line: '12.5', odds: '-114', hitRateL10: 64, riskTag: 'stable', gameId: 'g3' },
  { id: '6', player: 'F', market: 'pra', line: '27.5', odds: '-110', hitRateL10: 62, riskTag: 'stable', gameId: 'g3' },
  { id: '7', player: 'G', market: 'assists', line: '4.5', odds: '-105', hitRateL10: 66, riskTag: 'stable', gameId: 'g4' }
];

const slate = buildSlateSummary({
  mode: 'demo',
  generatedAt: '2026-01-15T19:30:00.000Z',
  leagues: ['NBA'],
  games: [
    {
      id: 'g1',
      league: 'NBA',
      status: 'upcoming',
      startTime: '8:00 PM ET',
      matchup: 'A @ B',
      teams: ['A', 'B'],
      bookContext: 'demo',
      propsPreview: [],
      provenance: 'demo',
      lastUpdated: '2026-01-15T19:30:00.000Z'
    }
  ]
});

describe('generateSuggestedSlips', () => {
  it('returns stable/balanced/ceiling profiles with expected leg counts', () => {
    const slips = generateSuggestedSlips(board, slate);

    expect(slips).toHaveLength(3);
    expect(slips.map((slip) => slip.profile)).toEqual(['stable', 'balanced', 'ceiling']);
    expect(slips[0]?.legs).toHaveLength(3);
    expect(slips[1]?.legs).toHaveLength(4);
    expect(slips[2]?.legs).toHaveLength(5);
  });
});
