'use client';

import { useNervousSystem } from './NervousSystemContext';

export function ContextBadge() {
  const { sport, date, tz, mode } = useNervousSystem();
  return <div className="rounded border border-white/15 px-2 py-1 text-[11px] text-slate-300">{sport} • {date} • {tz} • {mode}</div>;
}
