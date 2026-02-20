import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/research',
}));

import { AppShell } from '../src/components/terminal/AppShell';

describe('AppShell top nav', () => {
  it('renders bettor-first navigation labels', () => {
    const html = renderToStaticMarkup(
      <AppShell>
        <div>content</div>
      </AppShell>
    );

    expect(html).toContain('Analyze');
    expect(html).toContain('Scout');
    expect(html).toContain('Live');
    expect(html).toContain('Community');
    expect(html).not.toContain('>Build<');
    expect(html).not.toContain('href="/bets"');
  });
});
