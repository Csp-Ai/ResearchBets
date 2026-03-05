/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { LiveSnapshot } from '@/src/components/landing/LiveSnapshot';

describe('LiveSnapshot mode copy', () => {
  it('renders live copy when payload mode is live', () => {
    render(
      <LiveSnapshot
        mode="live"
        onRun={() => {}}
        loading={false}
        snapshot={{ mode: 'live', reason: 'live_ok', gamesCount: 4, headlineMatchup: 'A @ B', lastUpdatedAt: new Date().toISOString() }}
      />
    );

    expect(screen.getAllByText('Live feeds active').length).toBeGreaterThan(0);
  });

  it('renders demo copy only when payload mode is demo', () => {
    render(
      <LiveSnapshot
        mode="live"
        onRun={() => {}}
        loading={false}
        snapshot={{ mode: 'demo', reason: 'demo', gamesCount: 4, headlineMatchup: 'A @ B', lastUpdatedAt: new Date().toISOString() }}
      />
    );

    expect(screen.getAllByText('Demo mode (live feeds off)').length).toBeGreaterThan(0);
  });
});
