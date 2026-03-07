/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { AppShellProduct } from '@/src/components/terminal/AppShellProduct';

vi.mock('next/navigation', () => ({
  usePathname: () => '/today',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
}));

vi.mock('@/src/hooks/useDraftSlip', () => ({
  useDraftSlip: () => ({ slip: [], removeLeg: vi.fn(), clearSlip: vi.fn() })
}));

vi.mock('@/src/components/nervous/NervousSystemContext', () => ({
  useNervousSystem: () => ({
    sport: 'NBA',
    tz: 'America/Phoenix',
    date: '2026-01-01',
    mode: 'live',
    trace_id: 'trace-1',
    toHref: (path: string) => path
  })
}));

describe('AppShellProduct nav hierarchy', () => {
  it('emphasizes canonical bettor loop routes in primary nav', () => {
    render(<AppShellProduct><div>child</div></AppShellProduct>);

    expect(screen.getAllByRole('link', { name: 'Board' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Slip' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Analyze' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Track' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Review' }).length).toBeGreaterThan(0);
  });
});
