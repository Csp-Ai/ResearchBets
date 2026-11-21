import { describe, expect, it } from 'vitest';
import { inspectScreenshotTicket, screenshotCoverage } from '../screenshotTicketMetadata';

// Public selection descriptions transcribed from privately supplied screenshots.
// No phone UI, contacts, personal messages, account identifiers, links or raw
// screenshot bytes are stored in this public repository.
describe('real-layout screenshot contracts (synthetic, privacy-safe text fixtures)', () => {
  it('keeps Kalshi 10-market cost, max payout and contract percentage separate from sports odds', () => {
    const meta = inspectScreenshotTicket([
      '10 MARKET COMBO', 'Kalshi', 'COST $12.40', 'MAX PAYOUT $1,234.56',
      'OPEN POSITION', 'NCAA Football', 'Western Carolina to win 83%',
      'UC Davis to win 81%', 'Army to win 68%', 'Memphis to win 57%'
    ].join('\n'));
    expect(meta).toMatchObject({
      format: 'kalshi_combo', pricingKind: 'prediction_contract_percent',
      declaredLegCount: 10, cost: 12.40, statedMaxPayout: 1234.56,
      screenshotState: 'open_position'
    });
    expect(screenshotCoverage(meta, 4)).toMatchObject({ missingCount: 6, incomplete: true });
  });
  it('detects incomplete 12-market combo and does not manufacture its hidden selections', () => {
    const meta = inspectScreenshotTicket([
      '12 MARKET COMBO', 'Kalshi', 'COST $18.25', 'MAX PAYOUT $2,145.75',
      'OPEN POSITION', 'Tyrese Proctor: 2+ threes 62%',
      'CLE Cavaliers to win 68%', '+10 more markets'
    ].join('\n'));
    expect(meta).toMatchObject({ format: 'kalshi_combo', declaredLegCount: 12, hasHiddenLegs: true });
    expect(screenshotCoverage(meta, 2).missingCount).toBe(10);
    expect(screenshotCoverage(meta, 12).incomplete).toBe(false);
  });
  it('refuses to combine two differently sized closed positions captured in one image', () => {
    const meta = inspectScreenshotTicket([
      'Positions Cash Credit', 'Closed', '4 MARKET COMBO', 'ATL Hawks to win',
      '3 MARKET COMBO', 'HOU Rockets to win'
    ].join('\n'));
    expect(meta.declaredCountConflict).toBe(true);
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
      'Combo · 5 Markets', 'Kalshi', 'Cost $12.50',
      'To win 26.78X', '$334.75', 'Suns to win 90%',
      'Ravens to win 30%'
    ].join('\n'));
    expect(meta).toMatchObject({
      format: 'kalshi_combo', declaredLegCount: 5,
      cost: 12.50, statedMultiplier: 26.78,
      statedMaxPayout: null, pricingKind: 'prediction_contract_percent'
    });
  });
  it('separates mixed provider captures rather than inventing a unified ticket', () => {
    const meta = inspectScreenshotTicket('Kalshi 5 MARKET COMBO\nPrizePicks lineup');
    expect(meta.format).toBe('unknown');
    expect(meta.warnings.join(' ')).toMatch(/multiple sportsbook brands/i);
  });
});
