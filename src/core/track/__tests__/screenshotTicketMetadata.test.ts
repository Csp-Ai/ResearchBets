import { describe, expect, it } from 'vitest';
import { inspectScreenshotTicket, screenshotCoverage } from '../screenshotTicketMetadata';

// Public selection descriptions transcribed from privately supplied screenshots.
// No phone UI, contacts, personal messages, account identifiers, links or raw
// screenshot bytes are stored in this public repository.
describe('screenshot contracts (sanitized transcriptions and synthetic text variants)', () => {
  it('keeps Kalshi 10-market cost, max payout and contract percentage separate from sports odds', () => {
    const meta = inspectScreenshotTicket([
      '10-market combo', 'Kalshi', 'COST $9.73', 'MAXIMUM PAYOUT $9,090.90',
      'OPEN POSITION', 'NCAA Football', 'Western Carolina to win 83%',
      'UC Davis to win 81%', 'Army to win 68%', 'Memphis to win 57%'
    ].join('\n'));
    expect(meta).toMatchObject({
      format: 'kalshi_combo', pricingKind: 'prediction_contract_percent',
      declaredLegCount: 10, cost: 9.73, statedMaxPayout: 9090.90,
      screenshotState: 'open_position'
    });
    expect(screenshotCoverage(meta, 4)).toMatchObject({ missingCount: 6, incomplete: true });
  });
  it('detects incomplete 12-market combo and does not manufacture its hidden selections', () => {
    const meta = inspectScreenshotTicket([
      '12 MARKET COMBO', 'Kalshi', 'COST $9.95', 'MAX PAYOUT $1,162.79',
      'OPEN POSITION', 'Tyrese Proctor: 2+ threes 62%',
      'CLE Cavaliers to win 68%', '+10 more markets'
    ].join('\n'));
    expect(meta).toMatchObject({ format: 'kalshi_combo', declaredLegCount: 12, hasHiddenLegs: true });
    expect(screenshotCoverage(meta, 2).missingCount).toBe(10);
    expect(screenshotCoverage(meta, 5)).toEqual({
      missingCount: 7,
      incomplete: true,
      note: '5 of 12 selections recognized. 7 selections still need review.'
    });
    expect(screenshotCoverage(meta, 12).incomplete).toBe(false);
  });
  it('refuses to combine two differently sized closed positions captured in one image', () => {
    const meta = inspectScreenshotTicket([
      'Closed', '4 MARKET COMBO', '$146.84',
      '3 MARKET COMBO $0'
    ].join('\n'));
    expect(meta.declaredCountConflict).toBe(true);
    expect(meta.closedPositionObservations).toEqual([
      { declaredLegCount: 4, displayedAmount: 146.84 },
      { declaredLegCount: 3, displayedAmount: 0 }
    ]);
    expect(screenshotCoverage(meta, 2).incomplete).toBe(true);
  });
  it('never treats a closed-position label as evidence of a paid winning ticket', () => {
    const meta = inspectScreenshotTicket('4 MARKET COMBO\nPOSITION CLOSED\nATL Hawks to win');
    expect(meta.screenshotState).toBe('closed_position');
    expect(meta.warnings.join(' ')).toMatch(/does not prove a winning outcome/i);
  });
  it('keeps PrizePicks projections separate from quoted American odds', () => {
    const meta = inspectScreenshotTicket([
      'PrizePicks lineup', 'Nate Sheppard ↑ 25.5 Fantasy Score',
      'Franz Wagner ↑ 14.5 Reb+Asts', 'Daniss Jenkins ↑ 26.5 PRA'
    ].join('\n'));
    expect(meta.format).toBe('prizepicks_lineup');
    expect(meta.pricingKind).toBe('pickem_multiplier');
    expect(meta.officialCombinedAmericanOdds).toBeNull();
  });
  it('reads DraftKings SGP+ official headline without multiplying sublegs', () => {
    const meta = inspectScreenshotTicket([
      '11 Leg Same Game Parlay+ +11089', 'Includes: 2 Same Game Parlay bets + 6 selections',
      'Atlanta Hawks @ Oklahoma City Thunder', 'Oklahoma City Thunder MONEYLINE',
      'Shai Gilgeous-Alexander 40+ PTS + REB + AST'
    ].join('\n'));
    expect(meta.format).toBe('draftkings_sgp_plus');
    expect(meta.pricingKind).toBe('official_sgp_price');
    expect(meta.declaredLegCount).toBe(11);
    expect(meta.officialCombinedAmericanOdds).toBe('+11089');
  });
  it('does not confuse live contract cost, potential return, and stated multiplier', () => {
    const meta = inspectScreenshotTicket([
      'Combo · 5 Markets', 'Kalshi', 'Cost $10.16',
      'To win 26.78×', '$272.03', 'Suns to win 90%',
      'Ravens to win 30%'
    ].join('\n'));
    expect(meta).toMatchObject({
      format: 'kalshi_combo', declaredLegCount: 5,
      cost: 10.16, statedMultiplier: 26.78, displayedPotentialReturn: 272.03,
      statedMaxPayout: null, pricingKind: 'prediction_contract_percent'
    });
  });
  it('preserves a regular same-game combined quote separately from subleg odds', () => {
    const meta = inspectScreenshotTicket('FanDuel\n3-Leg Same Game Parlay\nOfficial combined odds: +415');
    expect(meta).toMatchObject({
      format: 'same_game_parlay', declaredLegCount: 3,
      pricingKind: 'official_sgp_price', officialCombinedAmericanOdds: '+415'
    });
  });

  it('recognizes a cropped unbranded quoted-contract list without asserting Kalshi identity', () => {
    const meta = inspectScreenshotTicket([
      'CHA Hornets vs ATL Hawks', 'Hawks to win 70%',
      'ORL Magic vs BKN Nets', 'Magic to win 69%',
      'PHX Suns vs UTA Jazz', 'Suns to win 63%'
    ].join('\n'));
    expect(meta.pricingKind).toBe('prediction_contract_percent');
    expect(meta.format).toBe('kalshi_combo');
    expect(meta.declaredLegCount).toBeNull();
    expect(meta.warnings.join(' ')).toMatch(/brand is not independently verified/);
  });

  it('separates mixed provider captures rather than inventing a unified ticket', () => {
    const meta = inspectScreenshotTicket('Kalshi 5 MARKET COMBO\nPrizePicks lineup');
    expect(meta.format).toBe('unknown');
    expect(meta.warnings.join(' ')).toMatch(/multiple sportsbook brands/i);
  });
});
