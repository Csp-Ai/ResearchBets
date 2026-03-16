/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { LiveNervousSystemStrip } from '@/src/components/nervous/LiveNervousSystemStrip';

describe('LiveNervousSystemStrip', () => {
  it('renders cache truth copy for live intent and rate limit reason', () => {
    render(<LiveNervousSystemStrip mode="cache" intentMode="live" reason="odds_rate_limited" />);
    expect(screen.getByText('Cached board active')).toBeTruthy();
    expect(screen.getAllByText('Rate limited').length).toBeGreaterThan(0);
    expect(screen.getByText('Requested live; showing cache fallback.')).toBeTruthy();
  });

  it('renders demo truth copy for live intent and rate limit reason', () => {
    render(<LiveNervousSystemStrip mode="demo" intentMode="live" reason="odds_rate_limited" />);
    expect(screen.getByText('Demo board active')).toBeTruthy();
    expect(screen.getAllByText('Rate limited').length).toBeGreaterThan(0);
    expect(screen.getByText('Requested live; showing deterministic demo slate.')).toBeTruthy();
  });

  it('shows live connected label', () => {
    render(<LiveNervousSystemStrip mode="live" providerSummary={{ okCount: 2, total: 2 }} traceId="t1" />);
    expect(screen.getByText('Live board active')).toBeTruthy();
  });
});
