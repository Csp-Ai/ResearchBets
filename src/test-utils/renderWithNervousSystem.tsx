import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';

import { NervousSystemProvider } from '@/src/components/nervous/NervousSystemContext';

type NervousOptions = {
  sport?: string;
  tz?: string;
  date?: string;
  mode?: 'live' | 'demo' | 'cache';
  trace_id?: string;
};

const DEFAULTS: Required<Omit<NervousOptions, 'trace_id'>> = {
  sport: 'NBA',
  tz: 'America/Phoenix',
  date: '2026-02-26',
  mode: 'demo'
};

export function renderWithNervousSystem(
  ui: React.ReactElement,
  nervous: NervousOptions = {},
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const spine = { ...DEFAULTS, ...nervous };
  const params = new URLSearchParams({
    sport: spine.sport,
    tz: spine.tz,
    date: spine.date,
    mode: spine.mode
  });
  if (nervous.trace_id) params.set('trace_id', nervous.trace_id);

  if (typeof window !== 'undefined') {
    window.history.replaceState({}, '', `/?${params.toString()}`);
  }

  return render(ui, {
    wrapper: ({ children }) => <NervousSystemProvider>{children}</NervousSystemProvider>,
    ...options
  });
}
