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
    expect(legs[2]?.marketType).toBe('rushing_receiving_yards');
    expect(legs.map((leg) => [leg.player, leg.marketLabel, leg.threshold])).toEqual([
      ['Rashee Rice', 'Receptions', 4],
      ['Travis Kelce', 'Receptions', 4],
      ['Kenneth Walker III', 'Rushing + receiving yards', 70],
    ]);
    expect(legs.every((leg) => leg.needsReview === false)).toBe(true);
  });

  it('recovers contiguous player, market and odds rows without manufacturing another leg', () => {
    const legs = parseSlipTextToLegs([
      'FanDuel Sportsbook',
      'NBA',
      'Same Game Parlay',
      'Jayson Tatum',
      'Over 29.5 Points',
      '-110',
      'Jaylen Brown',
      'Under 7.5 Rebounds',
      '+115',
      'Potential Payout $39.70',
    ].join('\n'), 'screenshot');
    expect(legs).toHaveLength(2);
    expect(legs.map(({player, marketType, threshold, direction, odds}) =>
      [player, marketType, threshold, direction, odds])).toEqual([
      ['Jayson Tatum', 'points', 29.5, 'over', '-110'],
      ['Jaylen Brown', 'rebounds', 7.5, 'under', '+115']
    ]);
    expect(legs.every((leg) => leg.league === 'NBA' && leg.directionObserved === true)).toBe(true);
  });

  it('keeps direction explicitly unresolved when an OCR line omits over/under', () => {
    const [leg] = parseSlipTextToLegs('Jayson Tatum 29.5 points -110', 'screenshot');
    expect(leg?.directionObserved).toBe(false);
    expect(leg?.needsReview).toBe(true);
  });

  it('never lets mixed sport headers force one sport for all legs', () => {
    const legs = parseSlipTextToLegs(['NBA','NFL','Jayson Tatum over 20.5 points -110'].join('\n'),'screenshot');
    expect(legs).toHaveLength(1);
    expect(legs[0]?.league).toBe('Unknown');
    expect(legs[0]?.needsReview).toBe(true);
  });

  it('parses visible Kalshi contract quotes without inventing American odds', () => {
    const legs = parseSlipTextToLegs([
      '10 MARKET COMBO', 'Kalshi', 'COST $12.40', 'MAX PAYOUT $1,234.56',
      'NCAA Football',
      'The Citadel at Western Carolina', 'Western Carolina to win 83%',
      'Cal Poly at UC Davis', 'UC Davis to win 81%',
      'East Carolina at Army', 'Army to win 68%',
      'Memphis at Navy', 'Memphis to win 57%'
    ].join('\n'),'screenshot');
    expect(legs).toHaveLength(4);
    expect(legs.map(l => [l.player, l.quotedContractPercent, l.odds])).toEqual([
      ['Western Carolina', 83, undefined], ['UC Davis', 81, undefined],
      ['Army', 68, undefined], ['Memphis', 57, undefined]
    ]);
    expect(legs.every(l => l.marketType === 'moneyline' && l.needsReview && l.league === 'NCAAF')).toBe(true);
  });

  it('preserves Kalshi NO contract direction without converting it to an Under bet', () => {
    const legs = parseSlipTextToLegs([
      '4 MARKET COMBO', 'Kalshi', 'POSITION CLOSED',
      'ATL Hawks to win', 'ORL Magic to win',
      'No · DEN Nuggets win by over 9.5 points'
    ].join('\n'),'screenshot');
    expect(legs).toHaveLength(3);
    expect(legs[2]).toMatchObject({
      player:'DEN Nuggets', marketType:'spread', contractSide:'no',
      threshold:9.5, directionObserved:false, unsupportedMarket:true, needsReview:true
    });
    expect(legs.every(l => l.odds === undefined)).toBe(true);
  });

  it('recovers PrizePicks prop rows with positions and preserves unsupported fantasy score', () => {
    const legs = parseSlipTextToLegs([
      'PrizePicks lineup',
      'Nate Sheppard', 'DUKE - RB - #20', '↑ 25.5', 'Fantasy Score',
      'Franz Wagner', 'ORL - F - #22', '↑ 14.5 Reb+Asts',
      'Daniss Jenkins', 'DET - G - #24', '↑ 26.5 PRA',
      'Quentin Grimes', 'LAL - G - #5', '↑ 25.5 PRA'
    ].join('\n'),'screenshot');
    expect(legs).toHaveLength(4);
    expect(legs[0]).toMatchObject({player:'Nate Sheppard',threshold:25.5,unsupportedMarket:true,needsReview:true});
    expect(legs.map(l => l.marketType)).toEqual(['points','ra','pra','pra']);
    expect(legs.every(l => l.odds === undefined)).toBe(true);
  });

  it('does not parse an SGP+ aggregate price as an individual prop', () => {
    const legs = parseSlipTextToLegs([
      '11 Leg Same Game Parlay+ +11089',
      'Same Game Parlay',
      'Atlanta Hawks @ Oklahoma City Thunder',
      'Oklahoma City Thunder',
      'MONEYLINE',
      'Shai Gilgeous-Alexander',
      '40+ PTS + REB + AST',
      'Isaiah Hartenstein',
      '15+ REB + AST',
      'Same Game Parlay',
      'Detroit Pistons @ New Orleans Pelicans',
      'Detroit Pistons',
      'MONEYLINE',
      'Cade Cunningham',
      '35+ PTS + REB + AST'
    ].join('\n'),'screenshot');
    expect(legs).toHaveLength(5);
    expect(legs.map(l=>l.player)).toEqual([
      'Oklahoma City Thunder','Shai Gilgeous-Alexander','Isaiah Hartenstein',
      'Detroit Pistons','Cade Cunningham'
    ]);
    expect(legs.map(l=>l.marketType)).toEqual(['moneyline','pra','ra','moneyline','pra']);
    expect(legs.every(l => l.odds == null)).toBe(true);
  });

  it('does not label an ambiguous player prop as NBA by default', () => {
    const [leg] = parseSlipTextToLegs('Unrecognized Name over 12.5 points +115', 'screenshot');
    expect(leg?.league).toBe('Unknown');
    expect(leg?.needsReview).toBe(true);
  });

  it('keeps unknown markets in review rather than pretending they are verified', () => {
    const [leg] = parseSlipTextToLegs('Mystery Player 12.5 mystery stat +100', 'paste');

    expect(leg?.marketLabel).toBe('Needs review');
    expect(leg?.needsReview).toBe(true);
  });
});
