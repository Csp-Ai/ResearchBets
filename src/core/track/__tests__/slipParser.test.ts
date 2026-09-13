import { describe, expect, it } from 'vitest';

import { parseSlipTextToLegs } from '@/src/core/track/slipParser';

describe('parseSlipTextToLegs', () => {
  it('normalizes NFL yardage props instead of falling back to points', () => {
    const legs = parseSlipTextToLegs(
      [
        'Justin Jefferson 60+ receiving yards -300 MIN @ GB',
        'Omarion Hampton 50+ rushing yards -250 ARI @ LAC',
        'Jalen Hurts 200+ passing yards -330 WAS @ PHI',
      ].join('\n'),
      'paste',
    );

    expect(legs.map((leg) => leg.marketType)).toEqual([
      'receiving_yards',
      'rushing_yards',
      'passing_yards',
    ]);
    expect(legs.every((leg) => leg.league === 'NFL')).toBe(true);
    expect(legs.map((leg) => leg.threshold)).toEqual([60, 50, 200]);
  });

  it('normalizes NFL receptions, carries, passing touchdowns and anytime touchdowns', () => {
    const legs = parseSlipTextToLegs(
      [
        'Malik Nabers 4+ receptions -390 DAL @ NYG',
        'Saquon Barkley over 15.5 carries -115 WAS @ PHI',
        'Jayden Daniels 1+ passing touchdowns -450 WAS @ PHI',
        'DeVon Achane anytime touchdown +125 MIA @ LV',
      ].join('\n'),
      'screenshot',
    );

    expect(legs.map((leg) => leg.marketType)).toEqual([
      'receptions',
      'carries',
      'passing_tds',
      'anytime_td',
    ]);
    expect(legs[3]?.threshold).toBe(1);
  });

  it('keeps unknown markets in review rather than pretending they are verified', () => {
    const [leg] = parseSlipTextToLegs('Mystery Player 12.5 mystery stat +100', 'paste');

    expect(leg?.marketLabel).toBe('Needs review');
    expect(leg?.needsReview).toBe(true);
  });
});
