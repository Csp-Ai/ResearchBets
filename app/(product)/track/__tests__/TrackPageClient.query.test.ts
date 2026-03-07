import { describe, expect, it } from 'vitest';

import { readTrackContinuityTagFromQuery, readTrackSlipIdFromQuery } from '../TrackPageClient';

describe('TrackPageClient query helpers', () => {
  it('prefers canonical slip_id and falls back to legacy slipId', () => {
    expect(readTrackSlipIdFromQuery(new URLSearchParams('slip_id=slip-1&slipId=legacy-1'))).toBe('slip-1');
    expect(readTrackSlipIdFromQuery(new URLSearchParams('slipId=legacy-1'))).toBe('legacy-1');
  });

  it('reads continuity tag for staged ticket handoff context', () => {
    expect(readTrackContinuityTagFromQuery(new URLSearchParams('continuity=staged_ticket'))).toBe('staged_ticket');
    expect(readTrackContinuityTagFromQuery(new URLSearchParams(''))).toBe('');
  });
});
