/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';

import HomePage from '@/app/page';
import { renderWithProviders } from '@/src/test-utils/renderWithProviders';

vi.mock('@/src/components/landing/BoardPreviewSSR', () => ({
  BoardPreviewSSR: () => <div data-testid="board-preview-ssr">board-preview</div>,
  getLandingSpineFromSearch: () => ({ sport: 'NBA', tz: 'America/New_York', date: '2026-01-01', mode: 'demo', trace_id: 'trace_home' })
}));

vi.mock('@/app/HomeLandingClient', () => ({
  default: () => <div data-testid="landing-compact-client">compact-client</div>
}));

describe('Unified home landing', () => {
  const renderHome = () => renderWithProviders(<HomePage searchParams={{ mode: 'demo' }} />);

  it('renders first fold spine + board + compact during tracker surface', () => {
    renderHome();

    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByTestId('board-preview-ssr')).toBeTruthy();
    expect(screen.getByTestId('landing-compact-client')).toBeTruthy();
    expect(screen.getByLabelText('landing-how-it-works')).toBeTruthy();
  });

  it('renders below-fold guidance modules', () => {
    renderHome();

    expect(screen.getAllByText('More').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('bda-strip').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Latest run').length).toBeGreaterThan(0);
  });
});
