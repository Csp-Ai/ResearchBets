import { describe, expect, it } from 'vitest';

import { asMarketType } from '../marketType';

describe('asMarketType', () => {
  it('accepts supported prop market aliases', () => {
    expect(asMarketType('PRA', 'spread')).toBe('pra');
    expect(asMarketType('THREES', 'spread')).toBe('threes');
    expect(asMarketType('points', 'spread')).toBe('points');
  });

  it('falls back for unsupported market values', () => {
    expect(asMarketType('first_basket', 'moneyline')).toBe('moneyline');
  });
});
