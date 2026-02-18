import { describe, expect, it } from 'vitest';

import { buildPlayerPropSuggestion } from '../playerPropInput';

describe('buildPlayerPropSuggestion', () => {
  it('defaults to points when marketType is missing', () => {
    const suggestion = buildPlayerPropSuggestion({ player: 'Kevin Durant', line: '28.5', odds: '-110' });

    expect(suggestion.marketType).toBe('points');
    expect(suggestion.legText).toBe('Kevin Durant points 28.5 -110');
  });

  it('normalizes unsupported marketType to points', () => {
    const suggestion = buildPlayerPropSuggestion({ player: 'Steph Curry', marketType: 'Buckets', odds: '120' });

    expect(suggestion.marketType).toBe('points');
    expect(suggestion.legText).toBe('Steph Curry points +120');
  });
});
