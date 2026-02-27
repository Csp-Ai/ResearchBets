/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import HomePage from '@/app/page';
import { NervousSystemProvider } from '@/src/components/nervous/NervousSystemContext';

vi.mock('@/src/components/landing/FrontdoorLandingClient', () => ({
  FrontdoorLandingClient: () => <div data-testid="frontdoor-client">frontdoor-client</div>
}));

describe('Unified home landing', () => {
  const renderHome = () => render(
    <NervousSystemProvider>
      <HomePage searchParams={{ mode: 'demo' }} />
    </NervousSystemProvider>
  );

  it('renders SSR terminal board and below-fold modules on /', () => {
    renderHome();

    expect(screen.getByText("Tonight's Board")).toBeTruthy();
    expect(screen.getByText('Demo mode (live feeds off)')).toBeTruthy();
    expect(screen.getByText('Slip rail')).toBeTruthy();
    expect(screen.getByLabelText('landing-how-it-works')).toBeTruthy();
    expect(screen.getByLabelText('bda-strip')).toBeTruthy();
  });

  it('accepts pasted slip text and detects supported books in postmortem wedge', () => {
    renderHome();

    const [textarea] = screen.getAllByLabelText('Paste slip text');
    expect(textarea).toBeTruthy();
    fireEvent.change(textarea as HTMLElement, { target: { value: 'FanDuel SGP\nJalen Brunson - over 24.5 pts +105' } });

    expect(screen.getByText('Detected: FanDuel')).toBeTruthy();
  });
});
