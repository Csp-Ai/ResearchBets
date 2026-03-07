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
    wrap(<SlipDrawer legs={[]} rationaleByLegId={new Map()} onRemove={vi.fn()} onRunStressTest={vi.fn()} />);
    expect(screen.getByText(/No ticket staged yet/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Analyze staged ticket/i })).toHaveProperty('disabled', true);
    expect(screen.getByRole('link', { name: /Track this run/i }).getAttribute('aria-disabled')).toBe('true');
  });

  it('enables analyze/track actions when legs are staged', () => {
    wrap(<SlipDrawer legs={[{ id: '1', player: 'Luka Doncic', marketType: 'points', line: '30.5', odds: '-110', game: 'LAL @ DAL' }]} rationaleByLegId={new Map([['1', { boardReason: 'Strong role stability', support: 'L5 form up', watchOut: 'Minutes dip', fragility: 'Fragility medium' }]])} onRemove={vi.fn()} onRunStressTest={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Analyze staged ticket/i })).toHaveProperty('disabled', false);
    expect(screen.getByRole('link', { name: /Track this run/i }).getAttribute('aria-disabled')).toBe('false');
    expect(screen.getByText(/Support:/i)).toBeTruthy();
    expect(screen.getByText(/Watch-out:/i)).toBeTruthy();
    expect(screen.getByLabelText('Decision thread strip')).toBeTruthy();
  });
});
