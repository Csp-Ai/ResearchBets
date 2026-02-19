import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

import { AppShell } from '../src/components/terminal/AppShell';

describe('AppShell', () => {
  it('renders primary nav items', () => {
    const html = renderToStaticMarkup(
      <AppShell>
        <div>content</div>
      </AppShell>
    );

    expect(html).toContain('Dashboard');
    expect(html).toContain('Ingest');
    expect(html).toContain('Research');
    expect(html).toContain('Bets');
    expect(html).toContain('Traces');
  });
});
