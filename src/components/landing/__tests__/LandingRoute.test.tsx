/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@/app/_components/CanonicalLanding', () => ({
  CanonicalLanding: ({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) => (
    <div data-testid="canonical-landing">{searchParams?.sport ?? 'NBA'}</div>
  )
}));

import HomePage from '@/app/page';

describe('Home landing route', () => {
  it('uses the shared canonical landing composition', () => {
    render(HomePage({ searchParams: { sport: 'NFL' } }));
    expect(screen.getByTestId('canonical-landing').textContent).toBe('NFL');
  });
});
