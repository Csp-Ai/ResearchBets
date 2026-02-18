import { describe, expect, it } from 'vitest';

import { extractLegs } from '../extract';

describe('extractLegs', () => {
  it('parses prop market names from raw lines', () => {
    const legs = extractLegs('Stephen Curry threes +120\nLeBron James points -110\nNikola Jokic PRA +100');

    expect(legs).toEqual([
      { selection: 'Stephen Curry', market: 'threes', odds: '+120' },
      { selection: 'LeBron James', market: 'points', odds: '-110' },
      { selection: 'Nikola Jokic', market: 'pra', odds: '+100' },
    ]);
  });
});
