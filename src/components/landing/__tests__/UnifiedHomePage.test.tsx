/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';

import HomePage from '@/app/(home)/page';
import { renderWithProviders } from '@/src/test-utils/renderWithProviders';

vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>) => {
    const Lazy = React.lazy(loader as () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>);
    return (props: Record<string, unknown>) => (
      <React.Suspense fallback={null}>
        <Lazy {...props} />
      </React.Suspense>
    );
  }
}));

vi.mock('@/src/components/landing/BoardPreviewSSR', () => ({
  getLandingSpineFromSearch: () => ({ sport: 'NBA', tz: 'America/New_York', date: '2026-01-01', mode: 'demo', trace_id: 'trace_home' })
}));

vi.mock('@/app/HomeLandingClientV4', () => ({
  default: () => <section aria-label="home-landing-v4-mock"><h1>Landing V4 cockpit</h1><p>Board + Draft Ticket + Nervous System</p></section>
}));

describe('Unified home landing', () => {
  const renderHome = () => renderWithProviders(<HomePage searchParams={{ mode: 'demo' }} />);

  it('renders the v4 first fold shell', async () => {
    renderHome();

    expect(await screen.findByText('Landing V4 cockpit')).toBeTruthy();
    expect(screen.getByText('Board + Draft Ticket + Nervous System')).toBeTruthy();
  });

  it('renders landing container and v4 mount', async () => {
    renderHome();

    expect((await screen.findAllByLabelText('home-landing-v4-mock')).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('main').length).toBeGreaterThan(0);
  });
});
