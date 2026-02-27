'use client';

import React, { useState } from 'react';
import { getModePresentation } from '@/src/core/mode';
import { RunStatusDetails } from './RunStatusDetails';
import type { ProviderHealth } from '@/src/core/today/types';

const freshness = (iso: string) => {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'fresh now';
  return `${mins}m old`;
};

export function RunStatusPill({ traceId, mode, providerHealth, generatedAt, seedHint }: { traceId?: string; mode: 'live' | 'cache' | 'demo'; providerHealth?: ProviderHealth[]; generatedAt: string; seedHint?: string }) {
  const [expanded, setExpanded] = useState(false);
  const modePresentation = getModePresentation(mode);
  const healthy = providerHealth?.filter((p) => p.ok).length ?? 0;
  const total = providerHealth?.length ?? 0;

  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/70 p-2" aria-label="run-status-pill">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <span className="rounded-full border border-white/20 px-2 py-1">{modePresentation.label}</span>
        <span>Providers {healthy}/{total || 1}</span>
        <span>{freshness(generatedAt)}</span>
        <button type="button" onClick={() => { if (traceId && navigator?.clipboard) void navigator.clipboard.writeText(traceId); }} className="text-slate-400">trace_id {traceId?.slice(0, 12) ?? '—'}</button>
        <button type="button" onClick={() => setExpanded((v) => !v)} className="rounded border border-white/20 px-2 py-1">{expanded ? 'Hide details' : 'Expand details'}</button>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">{mode === 'live' ? 'Live board connected.' : mode === 'cache' ? 'Cache board active while feeds recover.' : `Demo board active for ${seedHint ?? 'this spine'}.`}</p>
      {expanded ? <RunStatusDetails traceId={traceId} /> : null}
    </section>
  );
}
