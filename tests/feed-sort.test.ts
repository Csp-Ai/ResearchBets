import { describe, expect, it } from 'vitest';

import { decodeFeedCursor, encodeFeedCursor, isCursorCompatible, parseFeedSort } from '../src/core/feed/sort';

describe('feed sort cursor helpers', () => {
  it('defaults to latest and validates compatibility', () => {
    expect(parseFeedSort(null)).toBe('latest');
    expect(parseFeedSort('weird')).toBe('latest');

    const latest = { sort: 'latest' as const, createdAt: '2026-01-01T00:00:00.000Z', id: 'a' };
    const encoded = encodeFeedCursor(latest);
    const decoded = decodeFeedCursor(encoded);

    expect(decoded).toEqual(latest);
    expect(isCursorCompatible(decoded, 'latest')).toBe(true);
    expect(isCursorCompatible(decoded, 'trending')).toBe(false);
  });

  it('round-trips trending and high confidence cursors', () => {
    const trending = { sort: 'trending' as const, cloneCount: 9, createdAt: '2026-01-01T00:00:00.000Z', id: 'p1' };
    const highConfidence = { sort: 'high_confidence' as const, gmConfidence: 88, createdAt: '2026-01-01T00:00:00.000Z', id: 'p2' };

    expect(decodeFeedCursor(encodeFeedCursor(trending))).toEqual(trending);
    expect(decodeFeedCursor(encodeFeedCursor(highConfidence))).toEqual(highConfidence);
  });
});
