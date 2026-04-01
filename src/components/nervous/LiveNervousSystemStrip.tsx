'use client';

import { useMemo } from 'react';

import { getTruthModeCopy } from '@/src/core/ui/truthPresentation';

export type LiveNervousSystemStripProps = {
  mode: 'demo' | 'cache' | 'live';
  reason?: string;
  intentMode?: 'demo' | 'cache' | 'live';
  updatedAt?: string;
  providerSummary?: { okCount: number; total: number; degraded?: boolean };
  traceId?: string;
};

function updatedLabel(mode: 'demo' | 'cache' | 'live', updatedAt?: string): string {
  if (mode === 'demo') return 'Deterministic demo slate';
  if (!updatedAt) return 'Updated recently';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(updatedAt).getTime()) / 1000));
  if (seconds < 20) return 'Updated just now';
  if (seconds < 60) return `Updated ${seconds}s ago`;
  return `Updated ${Math.floor(seconds / 60)}m ago`;
}

function reasonLabel(reason?: string): string | undefined {
  if (reason === 'odds_rate_limited') return 'Rate limited';
  if (reason === 'odds_request_invalid') return 'Request invalid';
  if (reason === 'provider_unavailable') return 'Feeds degraded';
  return undefined;
}

export function LiveNervousSystemStrip({ mode, reason, intentMode, updatedAt, providerSummary, traceId }: LiveNervousSystemStripProps) {
  const providersDegraded = mode === 'cache'
    || providerSummary?.degraded
    || (typeof providerSummary?.total === 'number' && providerSummary.total > 0 && providerSummary.okCount < providerSummary.total)
    || Boolean(reason);
  const modeTruth = getTruthModeCopy({ mode, reason, intentMode });
  const secondaryLabel = reasonLabel(reason);
  const providerLabel = useMemo(() => {
    if (!providerSummary?.total) return 'Providers unavailable';
    if (providersDegraded) return `${providerSummary.okCount}/${providerSummary.total} providers healthy`;
    return `${providerSummary.okCount}/${providerSummary.total} providers healthy`;
  }, [providerSummary, providersDegraded]);
  const pipelineLabel = providersDegraded ? 'Degraded fallback active' : 'Pipeline healthy';

  return (
    <section className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2" data-testid="live-nervous-system-strip">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-200">Runtime</span>
        <div className="h-3 w-px bg-white/15" aria-hidden />
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/15 px-2 py-0.5">{modeTruth.label}</span>
          {secondaryLabel ? <span className="rounded-full border border-white/15 px-2 py-0.5">{secondaryLabel}</span> : null}
          <span>{providerLabel}</span>
          <span>{pipelineLabel}</span>
          <span>{updatedLabel(mode, updatedAt)}</span>
          {traceId ? <span className="text-slate-400">Trace {traceId.slice(0, 8)}</span> : null}
        </div>
      </div>
      {(modeTruth.intentHint || !traceId) ? (
        <p className="mt-1 text-[11px] text-slate-400">{modeTruth.intentHint ?? 'Ready for board-first ticket build.'}</p>
      ) : null}
    </section>
  );
}
