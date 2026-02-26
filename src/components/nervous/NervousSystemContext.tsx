'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type NervousSystemSpine = {
  mode: 'live' | 'demo';
  sport: string;
  tz: string;
  date: string;
  selectedGameId?: string;
  selectedPropId?: string;
  slipId?: string;
  traceId?: string;
};

type Ctx = NervousSystemSpine & {
  toHref: (path: string, overrides?: Partial<NervousSystemSpine>) => string;
};

const NervousSystemContext = createContext<Ctx | null>(null);

const readFromSearch = (): NervousSystemSpine => {
  if (typeof window === 'undefined') {
    return { mode: 'demo', sport: 'NBA', tz: 'America/Phoenix', date: new Date().toISOString().slice(0, 10) };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    mode: params.get('mode') === 'live' ? 'live' : 'demo',
    sport: params.get('sport') ?? 'NBA',
    tz: params.get('tz') ?? 'America/Phoenix',
    date: params.get('date') ?? new Date().toISOString().slice(0, 10),
    selectedGameId: params.get('gameId') ?? undefined,
    selectedPropId: params.get('propId') ?? undefined,
    slipId: params.get('slipId') ?? undefined,
    traceId: params.get('trace') ?? params.get('traceId') ?? undefined
  };
};

export function NervousSystemProvider({ children }: { children: React.ReactNode }) {
  const [spine, setSpine] = useState<NervousSystemSpine>(() => readFromSearch());

  useEffect(() => {
    const sync = () => setSpine(readFromSearch());
    sync();
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  const value = useMemo<Ctx>(() => {
    const toHref: Ctx['toHref'] = (path, overrides) => {
      const merged = { ...spine, ...overrides };
      const q = new URLSearchParams();
      q.set('mode', merged.mode);
      q.set('sport', merged.sport);
      q.set('tz', merged.tz);
      q.set('date', merged.date);
      if (merged.selectedGameId) q.set('gameId', merged.selectedGameId);
      if (merged.selectedPropId) q.set('propId', merged.selectedPropId);
      if (merged.slipId) q.set('slipId', merged.slipId);
      if (merged.traceId) q.set('trace', merged.traceId);
      return `${path}${path.includes('?') ? '&' : '?'}${q.toString()}`;
    };

    return { ...spine, toHref };
  }, [spine]);

  return <NervousSystemContext.Provider value={value}>{children}</NervousSystemContext.Provider>;
}

export const useNervousSystem = () => {
  const ctx = useContext(NervousSystemContext);
  if (!ctx) {
    throw new Error('useNervousSystem must be used inside NervousSystemProvider');
  }
  return ctx;
};
