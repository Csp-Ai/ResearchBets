import { describe, expect, it } from 'vitest';

import { readTrackSlipIdFromQuery } from '@/app/(product)/track/TrackPageClient';

describe('track slip query boundary', () => {
  it('prefers canonical slip_id over legacy slipId', () => {
    const params = new URLSearchParams('slip_id=canonical-1&slipId=legacy-1');
    expect(readTrackSlipIdFromQuery(params)).toBe('canonical-1');
  });

  it('falls back to legacy slipId for old shared links', () => {
    const params = new URLSearchParams('slipId=legacy-2');
    expect(readTrackSlipIdFromQuery(params)).toBe('legacy-2');
  });
});
