import { describe, expect, it } from 'vitest';

import { buildLoopProvenance, getLoopTrustBadges } from '@/src/core/bettor-loop/provenance';

describe('bettor loop provenance', () => {
  it('returns bettor-readable badges for live verified records', () => {
    const badges = getLoopTrustBadges(
      buildLoopProvenance({
        mode: 'live',
        sourceType: 'tracked_ticket',
        reviewState: 'verified'
      })
    );

    expect(badges.map((badge) => badge.label)).toEqual([
      'Live-backed',
      'Tracked ticket',
      'Verified record'
    ]);
  });

  it('keeps parser-derived demo flows explicitly labeled', () => {
    const badges = getLoopTrustBadges(
      buildLoopProvenance({
        mode: 'demo',
        sourceType: 'parser_derived',
        reviewState: 'unreviewed'
      })
    );

    expect(badges.map((badge) => badge.label)).toEqual([
      'Demo mode (live feeds off)',
      'Parser-derived entry',
      'Needs review'
    ]);
  });
});
