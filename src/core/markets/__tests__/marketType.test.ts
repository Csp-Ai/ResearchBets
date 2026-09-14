import { describe, expect, it } from 'vitest';

import { asMarketType } from '../marketType';

describe('asMarketType', () => {
  it('accepts supported basketball prop market aliases', () => {
    expect(asMarketType('PRA', 'spread')).toBe('pra');
    expect(asMarketType('THREES', 'spread')).toBe('threes');
    expect(asMarketType('points', 'spread')).toBe('points');
  });

  it('accepts canonical and common NFL prop aliases', () => {
    expect(asMarketType('rushing yards', 'spread')).toBe('rushing_yards');
    expect(asMarketType('rec_yds', 'spread')).toBe('receiving_yards');
    expect(asMarketType('pass_tds', 'spread')).toBe('passing_tds');
    expect(asMarketType('rush attempts', 'spread')).toBe('carries');
    expect(asMarketType('ATTD', 'spread')).toBe('anytime_td');
  });

  it('falls back for unsupported market values', () => {
    expect(asMarketType('first_basket', 'moneyline')).toBe('moneyline');
  });
});
