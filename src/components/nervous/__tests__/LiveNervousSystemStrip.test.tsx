/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { LiveNervousSystemStrip } from '@/src/components/nervous/LiveNervousSystemStrip';

describe('LiveNervousSystemStrip', () => {
  it('renders cache truth copy for live intent and rate limit reason', () => {
    render(<LiveNervousSystemStrip mode="cache" intentMode="live" reason="odds_rate_limited" />);
    expect(screen.getByText('Using cached slate')).toBeTruthy();
    expect(screen.getAllByText('Rate limited').length).toBeGreaterThan(0);
    expect(screen.getByText('Live intent → Showing cached slate')).toBeTruthy();
  });

  it('renders demo truth copy for live intent and rate limit reason', () => {
    render(<LiveNervousSystemStrip mode="demo" intentMode="live" reason="odds_rate_limited" />);
    expect(screen.getByText('Demo mode (live feeds off)')).toBeTruthy();
    expect(screen.getAllByText('Rate limited').length).toBeGreaterThan(0);
    expect(screen.getByText('Live intent → Demo feeds off')).toBeTruthy();
  });

  it('shows live connected label', () => {
    render(<LiveNervousSystemStrip mode="live" providerSummary={{ okCount: 2, total: 2 }} traceId="t1" />);
    expect(screen.getByText('Live feeds connected')).toBeTruthy();
  });
});
