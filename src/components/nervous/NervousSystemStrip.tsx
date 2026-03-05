'use client';

import { useMemo, useState } from 'react';

export type NervousStepId = 'context' | 'events' | 'odds' | 'stats' | 'build' | 'viability';
export type NervousStepState = 'idle' | 'running' | 'ok' | 'degraded';

export type NervousSystemStep = {
  id: NervousStepId;
  state: NervousStepState;
  label: string;
};

export function mapProviderHealthToNervousSteps(health?: {
  checks?: { odds?: { ok: boolean }; events?: { ok: boolean }; stats?: string };
  mode?: 'live' | 'cache' | 'demo';
} | null): NervousSystemStep[] {
  const steps: NervousSystemStep[] = [
    { id: 'context', label: 'Context', state: 'ok' },
    { id: 'events', label: 'Events', state: health?.checks?.events?.ok === false ? 'degraded' : 'ok' },
    { id: 'odds', label: 'Odds', state: health?.checks?.odds?.ok === false ? 'degraded' : 'ok' },
    { id: 'stats', label: 'Stats', state: health?.checks?.stats === 'missing' ? 'degraded' : 'ok' },
    { id: 'build', label: 'Build', state: health?.mode === 'cache' ? 'degraded' : 'ok' },
    { id: 'viability', label: 'Viability', state: health?.mode === 'live' ? 'ok' : health?.mode === 'demo' ? 'idle' : 'degraded' },
  ];
  return steps;
}

export function NervousSystemStrip({
  mode,
  steps,
  collapsedByDefault = false,
}: {
  mode: 'live' | 'cache' | 'demo';
  steps: NervousSystemStep[];
  collapsedByDefault?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(collapsedByDefault);
  const summary = useMemo(() => {
    if (mode === 'demo') return 'Demo mode (live feeds off)';
    if (mode === 'live') return 'Live feeds active';
    return 'Limited live feeds (degraded)';
  }, [mode]);

  const tone = (state: NervousStepState) => {
    if (state === 'ok') return 'border-emerald-400/35 text-emerald-100';
    if (state === 'degraded') return 'border-amber-300/35 text-amber-100';
    if (state === 'running') return 'border-cyan-300/35 text-cyan-100';
    return 'border-white/15 text-slate-400';
  };

  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/55 p-2.5" aria-label="nervous-system-strip">
      <button type="button" onClick={() => setCollapsed((v) => !v)} className="flex w-full items-center justify-between text-xs text-slate-200">
        <span>{summary}</span>
        <span aria-hidden>{collapsed ? '▸' : '▾'}</span>
      </button>
      {!collapsed ? (
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-6">
          {steps.map((step) => (
            <span key={step.id} className={`rounded-md border px-2 py-1 text-center text-[11px] ${tone(step.state)}`}>
              {step.label}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
