'use client';

import { useEffect, useMemo, useState } from 'react';

import { getTruthModeCopy } from '@/src/core/ui/truthPresentation';

export type NervousStepState = 'idle' | 'running' | 'ok' | 'degraded' | 'fallback';

export type LiveNervousSystemStripProps = {
  mode: 'demo' | 'cache' | 'live';
  reason?: string;
  intentMode?: 'demo' | 'cache' | 'live';
  updatedAt?: string;
  providerSummary?: { okCount: number; total: number; degraded?: boolean };
  traceId?: string;
};

const STEP_NAMES = ['Context', 'Providers', 'Normalize', 'Signals', 'Verdict'] as const;

const stateClasses: Record<NervousStepState, string> = {
  idle: 'border-white/15 text-slate-500',
  running: 'border-cyan-300/60 text-cyan-100 animate-pulse',
  ok: 'border-emerald-300/60 text-emerald-200',
  degraded: 'border-amber-300/60 text-amber-200',
  fallback: 'border-violet-300/60 text-violet-200'
};

function updatedLabel(updatedAt?: string): string {
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
  const [demoStage, setDemoStage] = useState(0);
  const isDemoWarmup = mode === 'demo' && !traceId;

  useEffect(() => {
    if (!isDemoWarmup) {
      setDemoStage(STEP_NAMES.length);
      return;
    }
    setDemoStage(0);
    const timers = [250, 520, 810, 1120, 1420].map((ms, index) => window.setTimeout(() => setDemoStage(index + 1), ms));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [isDemoWarmup]);

  const providersDegraded = mode === 'cache'
    || providerSummary?.degraded
    || (typeof providerSummary?.total === 'number' && providerSummary.total > 0 && providerSummary.okCount < providerSummary.total)
    || Boolean(reason);

  const steps = useMemo(() => {
    if (isDemoWarmup) {
      return STEP_NAMES.map((name, index) => ({
        name,
        state: index < demoStage ? 'ok' : index === demoStage ? 'running' : 'idle' as NervousStepState
      }));
    }

    return STEP_NAMES.map((name, index) => {
      if (index === 1 && providersDegraded) {
        return { name, state: mode === 'cache' ? 'fallback' : 'degraded' as NervousStepState };
      }
      return { name, state: 'ok' as NervousStepState };
    });
  }, [demoStage, isDemoWarmup, mode, providersDegraded]);

  const modeTruth = getTruthModeCopy({ mode, reason, intentMode });
  const secondaryLabel = reasonLabel(reason);

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-3" data-testid="live-nervous-system-strip">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-100">Live Nervous System</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
          <span className="rounded-full border border-white/15 px-2 py-0.5">{modeTruth.label}</span>
          {secondaryLabel ? <span className="rounded-full border border-white/15 px-2 py-0.5">{secondaryLabel}</span> : null}
          {providerSummary?.total ? <span>{providerSummary.okCount}/{providerSummary.total} providers</span> : null}
          <span>{updatedLabel(updatedAt)}</span>
        </div>
      </div>
      {modeTruth.intentHint ? <p className="mt-1 text-xs text-slate-400">{modeTruth.intentHint}</p> : null}
      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
        {steps.map((step) => (
          <span key={step.name} className={`rounded-md border px-2 py-1 text-center text-[11px] ${stateClasses[step.state]}`}>
            {step.name}
          </span>
        ))}
      </div>
      {!traceId ? <p className="mt-2 text-xs text-slate-400">Ready to run — add 2–4 legs.</p> : null}
    </section>
  );
}
