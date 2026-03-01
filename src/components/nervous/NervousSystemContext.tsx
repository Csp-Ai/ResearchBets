'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { toHref as buildHref } from '@/src/core/nervous/routes';
import { DEFAULT_SPINE, parseSpineFromSearch, type QuerySpine } from '@/src/core/nervous/spine';

type Ctx = QuerySpine & {
  toHref: (path: string, overrides?: Partial<QuerySpine> & Record<string, string | number | undefined>) => string;
};

const NervousSystemContext = createContext<Ctx | null>(null);

const readFromSearch = (): QuerySpine => {
  if (typeof window === 'undefined') return DEFAULT_SPINE;
  return parseSpineFromSearch(window.location.search);
};

export function NervousSystemProvider({ children }: { children: React.ReactNode }) {
  const [spine, setSpine] = useState<QuerySpine>(() => readFromSearch());

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

  const value = useMemo<Ctx>(() => ({
    ...spine,
    toHref: (path, overrides) => buildHref(path, spine, overrides)
  }), [spine]);

  return <NervousSystemContext.Provider value={value}>{children}</NervousSystemContext.Provider>;
}

export const useNervousSystem = () => {
  const ctx = useContext(NervousSystemContext);
  if (!ctx) {
    return {
      ...DEFAULT_SPINE,
      toHref: (path: string, overrides?: Partial<QuerySpine> & Record<string, string | number | undefined>) => buildHref(path, DEFAULT_SPINE, overrides)
    };
  }
  return ctx;
};
