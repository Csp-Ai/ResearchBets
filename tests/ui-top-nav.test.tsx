/** @vitest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/stress-test',
  useRouter: () => ({ push: vi.fn() })
}));

import { AppShell } from '../src/components/terminal/AppShell';

describe('AppShell top nav', () => {
  it('renders bettor-first navigation labels', async () => {
    render(
      <AppShell>
        <div>content</div>
      </AppShell>
    );

    expect((await screen.findAllByText('Board')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Slip').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Stress Test').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Control Room').length).toBeGreaterThan(0);
    expect(screen.queryByText('Community')).toBeNull();
  });
});
