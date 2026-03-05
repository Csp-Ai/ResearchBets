import { describe, expect, it } from 'vitest';

import type { CockpitBoardLeg } from '@/app/cockpit/adapters/todayToBoard';
import { pickMostFragileProp } from '@/src/components/landing/boardFragility';

const makeRow = (overrides: Partial<CockpitBoardLeg>): CockpitBoardLeg => ({
  id: 'row-1',
  player: 'J. Tatum',
  market: 'PTS',
  line: '28.5',
  odds: '-110',
  hitRateL10: null,
  riskTag: 'stable',
  gameId: 'g1',
  matchup: 'LAL @ BOS',
  startTime: '8:00 PM',
  ...overrides
});

describe('pickMostFragileProp', () => {
  it('selects highest fragility from rows', () => {
    const rows: CockpitBoardLeg[] = [
      makeRow({ id: 'a', player: 'A', threesAttL1: 6, threesAttL3Avg: 6 }),
      makeRow({ id: 'b', player: 'B', threesAttL1: 2, threesAttL3Avg: 6, market: '3PM' })
    ];

    const pick = pickMostFragileProp(rows);

    expect(pick?.rowId).toBe('b');
    expect(pick?.fragility).toBeGreaterThan(0);
  });

  it('attempts drop increases score vs baseline', () => {
    const baseline = pickMostFragileProp([makeRow({ id: 'base', threesAttL1: 6, threesAttL3Avg: 6 })]);
    const withDrop = pickMostFragileProp([makeRow({ id: 'drop', threesAttL1: 2, threesAttL3Avg: 6 })]);

    expect((withDrop?.fragility ?? 0)).toBeGreaterThan(baseline?.fragility ?? 0);
  });

  it('missing attempts fields does not throw and remains deterministic', () => {
    const rows: CockpitBoardLeg[] = [
      makeRow({ id: 'zeta', player: 'Zeta' }),
      makeRow({ id: 'alpha', player: 'Alpha', market: 'REB', riskTag: 'watch' })
    ];

    const one = pickMostFragileProp(rows);
    const two = pickMostFragileProp(rows);

    expect(one?.rowId).toBe('alpha');
    expect(two?.rowId).toBe('alpha');
  });

  it('tie-break is deterministic', () => {
    const rows: CockpitBoardLeg[] = [
      makeRow({ id: 'b-row', player: 'B', market: 'AST', riskTag: 'watch' }),
      makeRow({ id: 'a-row', player: 'A', market: 'AST', riskTag: 'watch' })
    ];

    const pick = pickMostFragileProp(rows);

    expect(pick?.rowId).toBe('a-row');
    expect(pick?.fragility).toBeCloseTo(0.25, 5);
  });
});
