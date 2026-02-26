/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import HomePage from '@/app/page';

vi.mock('@/src/components/landing/FrontdoorLandingClient', () => ({
  FrontdoorLandingClient: () => <div data-testid="frontdoor-client">frontdoor-client</div>
}));

describe('Unified home landing', () => {
  it('renders SSR terminal board and below-fold modules on /', () => {
    render(<HomePage searchParams={{ mode: 'demo' }} />);

    expect(screen.getByText("Tonight's Board")).toBeTruthy();
    expect(screen.getByText('DEMO')).toBeTruthy();
    expect(screen.getByText('Slip rail')).toBeTruthy();
    expect(screen.getByLabelText('landing-how-it-works')).toBeTruthy();
    expect(screen.getByLabelText('bda-strip')).toBeTruthy();
  });
});
