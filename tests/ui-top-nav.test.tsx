import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/stress-test',
  useRouter: () => ({ push: vi.fn() })
}));

import { AppShell } from '../src/components/terminal/AppShell';

describe('AppShell top nav', () => {
  it('renders bettor-first navigation labels', () => {
    const html = renderToStaticMarkup(
      <AppShell>
        <div>content</div>
      </AppShell>
    );

    expect(html).toContain('Board');
    expect(html).toContain('Slip');
    expect(html).toContain('Stress Test');
    expect(html).toContain('Control Room');
    expect(html).not.toContain('Community');
  });
});
