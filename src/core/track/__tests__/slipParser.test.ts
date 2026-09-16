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

  it('fuses FanDuel-style split OCR lines into canonical NFL props', () => {
    const legs = parseSlipTextToLegs(
      [
        'Same Game Parlay +155',
        'Green Bay Packers 19',
        'Minnesota Vikings 10',
        'Justin Jefferson 60+ Yards',
        'JUSTIN JEFFERSON - ALT RECEIVING YDS',
        'Jordan Mason 40+ Yards',
        'JORDAN MASON - ALT RUSHING YDS',
        'LIVE 3rd',
        'Jalen Hurts 200+ Yards',
        'JALEN HURTS - ALT PASSING YDS',
        'Jayden Daniels 1+ Passing Touchdowns',
        'JAYDEN DANIELS - ALT PASSING TDS',
      ].join('\n'),
      'screenshot',
    );

    expect(legs).toHaveLength(4);
    expect(legs.map((leg) => [leg.player, leg.marketType, leg.threshold])).toEqual([
      ['Justin Jefferson', 'receiving_yards', 60],
      ['Jordan Mason', 'rushing_yards', 40],
      ['Jalen Hurts', 'passing_yards', 200],
      ['Jayden Daniels', 'passing_tds', 1],
    ]);
    expect(legs.every((leg) => leg.parseConfidence === 'high')).toBe(true);
  });

  it('ignores sportsbook chrome and score rows instead of manufacturing fake legs', () => {
    const legs = parseSlipTextToLegs(
      [
        'My Bets',
        'Open Settled Saved',
        'Arizona Cardinals 16',
        'Los Angeles Chargers 7',
        'Ladd McConkey 40+ Yards',
        'LADD MCCONKEY - ALT RECEIVING YDS',
        'Cash out $7.48',
        'Reuse Share bet Pin bet',
      ].join('\n'),
      'screenshot',
    );

    expect(legs).toHaveLength(1);
    expect(legs[0]).toMatchObject({
      player: 'Ladd McConkey',
      marketType: 'receiving_yards',
      threshold: 40,
      needsReview: false,
    });
  });

  it('recovers legs from noisy sportsbook OCR without turning chrome into selections', () => {
    const legs = parseSlipTextToLegs(
      [
        'Box Score > Play-by-play > Go to event > Te Rashee Rice 4+ Receptions',
        'RASHEE RICE – ALT RECEPTIONS',
        '–1) LJJ',
        '4',
        '2 Travis Kelce 4+ Receptions ©',
        'TRAVIS KELCE – ALT RECEPTIONS',
        '–1) LJJ',
        '4',
        '2 Kenneth Walker III 70+ Yards &)',
        '©) KENNETH WALKER [11 – ALT RUSHING +',
        'RECEIVING',
        'YDS',
      ].join('\n'),
      'screenshot',
    );

    expect(legs).toHaveLength(3);
    expect(legs.map((leg) => [leg.player, leg.marketLabel, leg.threshold])).toEqual([
      ['Rashee Rice', 'Receptions', 4],
      ['Travis Kelce', 'Receptions', 4],
      ['Kenneth Walker III', 'Rushing + receiving yards', 70],
    ]);
    expect(legs.every((leg) => leg.needsReview === false)).toBe(true);
  });

  it('keeps unknown markets in review rather than pretending they are verified', () => {
    const [leg] = parseSlipTextToLegs('Mystery Player 12.5 mystery stat +100', 'paste');

    expect(leg?.marketLabel).toBe('Needs review');
    expect(leg?.needsReview).toBe(true);
  });
});
