/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { SlipDrawer } from '../SlipDrawer';
import { NervousSystemProvider } from '@/src/components/nervous/NervousSystemContext';


afterEach(() => {
  cleanup();
});

const wrap = (ui: React.ReactNode) => render(
  <NervousSystemProvider
    initialSpine={{ sport: 'NBA', tz: 'ET', date: '2026-02-20', mode: 'demo', trace_id: 'trace-1', tab: 'before' }}
  >
    {ui}
  </NervousSystemProvider>
);

describe('SlipDrawer', () => {
  it('de-emphasizes track/analyze actions when no legs are staged', () => {
    wrap(<SlipDrawer legs={[]} onRemove={vi.fn()} onRunStressTest={vi.fn()} />);
    expect(screen.getByText(/No ticket staged yet/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Analyze staged ticket/i })).toHaveProperty('disabled', true);
    expect(screen.getByRole('link', { name: /Track ticket/i }).getAttribute('aria-disabled')).toBe('true');
  });

  it('enables analyze/track actions when legs are staged', () => {
    wrap(<SlipDrawer legs={[{ id: '1', player: 'Luka Doncic', marketType: 'points', line: '30.5', odds: '-110', game: 'LAL @ DAL' }]} onRemove={vi.fn()} onRunStressTest={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Analyze staged ticket/i })).toHaveProperty('disabled', false);
    expect(screen.getByRole('link', { name: /Track ticket/i }).getAttribute('aria-disabled')).toBe('false');
  });
});
