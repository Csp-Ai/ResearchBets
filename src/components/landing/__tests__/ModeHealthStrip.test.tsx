/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ModeHealthStrip } from '../ModeHealthStrip';

describe('ModeHealthStrip', () => {
  it('renders demo mode copy', () => {
    render(
      <ModeHealthStrip
        mode="demo"
        asOf={new Date('2026-01-01T12:00:00Z')}
        feeds={[{ label: 'Today', state: 'ok' }, { label: 'Market', state: 'warn' }]}
      />
    );

    expect(screen.getByText('DEMO')).toBeTruthy();
    expect(screen.getByText('Demo mode (live feeds off)')).toBeTruthy();
  });

  it('renders live healthy copy', () => {
    render(
      <ModeHealthStrip
        mode="live"
        asOf={new Date('2026-01-01T12:00:00Z')}
        feeds={[{ label: 'Today', state: 'ok' }, { label: 'Market', state: 'ok' }]}
      />
    );

    expect(screen.getByText('LIVE')).toBeTruthy();
    expect(screen.getByText('Live')).toBeTruthy();
  });

  it('renders degraded live copy', () => {
    render(
      <ModeHealthStrip
        mode="live"
        asOf={new Date('2026-01-01T12:00:00Z')}
        feeds={[{ label: 'Today', state: 'ok' }, { label: 'Market', state: 'warn' }]}
      />
    );

    expect(screen.getByText('Live mode (some feeds unavailable)')).toBeTruthy();
  });
});
