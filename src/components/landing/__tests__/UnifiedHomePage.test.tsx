/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';

import HomePage from '@/app/page';
import { renderWithProviders } from '@/src/test-utils/renderWithProviders';

vi.mock('@/src/components/landing/FrontdoorLandingClient', () => ({
  FrontdoorLandingClient: () => <div data-testid="frontdoor-client">frontdoor-client</div>
}));

describe('Unified home landing', () => {
  const renderHome = () => renderWithProviders(<HomePage searchParams={{ mode: 'demo' }} />);

  it('renders frontdoor client and first-fold truth spine on /', () => {
    renderHome();

    expect(screen.getByTestId('frontdoor-client')).toBeTruthy();
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Demo mode (live feeds off)')).toBeTruthy();
    expect(screen.getByLabelText('landing-how-it-works')).toBeTruthy();
  });

  it('renders below-fold guidance modules', () => {
    renderHome();

    expect(screen.getAllByText('More').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('bda-strip').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Latest run').length).toBeGreaterThan(0);
  });
});
