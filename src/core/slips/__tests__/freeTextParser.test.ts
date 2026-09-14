import { describe, expect, it } from 'vitest';

import { parseSlipText } from '../freeTextParser';

describe('parseSlipText NFL props', () => {
  it('parses common NFL yardage and passing touchdown alt lines', () => {
    const parsed = parseSlipText(`NFL FanDuel
Saquon Barkley 60+ rushing yards -146
Justin Jefferson 60+ receiving yards -260
Jayden Daniels 1+ passing TDs -225`);

    expect(parsed.legs).toHaveLength(3);
    expect(parsed.legs[0]).toMatchObject({
      league: 'NFL',
      teamOrPlayer: 'Saquon Barkley',
      marketType: 'rushing_yards',
      line: 60,
      odds: -146,
      book: 'fanduel'
    });
    expect(parsed.legs[1]).toMatchObject({
      teamOrPlayer: 'Justin Jefferson',
      marketType: 'receiving_yards',
      line: 60
    });
    expect(parsed.legs[2]).toMatchObject({
      teamOrPlayer: 'Jayden Daniels',
      marketType: 'passing_tds',
      line: 1
    });
  });

  it('parses anytime touchdown legs without requiring a numeric threshold', () => {
    const parsed = parseSlipText('NFL DraftKings Derrick Henry anytime touchdown scorer -195');

    expect(parsed.legs).toHaveLength(1);
    expect(parsed.legs[0]).toMatchObject({
      teamOrPlayer: 'Derrick Henry',
      marketType: 'anytime_td',
      line: 1,
      odds: -195,
      book: 'draftkings'
    });
  });
});
