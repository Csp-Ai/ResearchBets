/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { LiveNervousSystemStrip } from '@/src/components/nervous/LiveNervousSystemStrip';

describe('LiveNervousSystemStrip', () => {
  it('shows demo-neutral label', () => {
    render(<LiveNervousSystemStrip mode="demo" />);
    expect(screen.getByText('Feeds off (demo)')).toBeTruthy();
  });

  it('shows cache fallback label', () => {
    render(<LiveNervousSystemStrip mode="cache" reason="cached_fallback" />);
    expect(screen.getByText('Using cached slate')).toBeTruthy();
  });

  it('shows live connected label', () => {
    render(<LiveNervousSystemStrip mode="live" providerSummary={{ okCount: 2, total: 2 }} traceId="t1" />);
    expect(screen.getByText('Live feeds connected')).toBeTruthy();
  });
});
