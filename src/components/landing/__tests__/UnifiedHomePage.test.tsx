/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import HomePage from '@/app/page';

vi.mock('@/src/components/landing/FrontdoorLandingClient', () => ({
  FrontdoorLandingClient: () => <div data-testid="frontdoor-client">frontdoor-client</div>
}));

describe('Unified home landing', () => {
  it('renders SSR proof and below-fold BDA module on /', () => {
    render(<HomePage searchParams={{ mode: 'demo' }} />);

    expect(screen.getByLabelText('board-preview-ssr')).toBeTruthy();
    expect(screen.getByLabelText('bda-strip')).toBeTruthy();
    expect(screen.getByText('Before · During · After')).toBeTruthy();
  });
});
