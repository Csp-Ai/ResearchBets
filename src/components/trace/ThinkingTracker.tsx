'use client';

import React from 'react';
import { useMemo } from 'react';

import { useTraceEvents } from '@/src/hooks/useTraceEvents';

type StepKey = 'Scout' | 'Stats' | 'Line' | 'Risk' | 'Verdict';

type ThinkingTrackerProps = {
  traceId?: string;
  mode: 'live' | 'cache' | 'demo';
  pollIntervalMs?: number;
  seedHint?: string;
  compact?: boolean;
};

const STEPS: StepKey[] = ['Scout', 'Stats', 'Line', 'Risk', 'Verdict'];

const eventToStep = (eventName: string): StepKey => {
  if (eventName.includes('slip_submitted') || eventName.includes('ui_action_started')) return 'Scout';
  if (eventName.includes('slip_extracted') || eventName.includes('data_normalized')) return 'Stats';
  if (eventName.includes('odds') || eventName.includes('delta_computed') || eventName.includes('line')) return 'Line';
  if (eventName.includes('model') || eventName.includes('risk') || eventName.includes('consensus')) return 'Risk';
  return 'Verdict';
};

const hashSeed = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export function ThinkingTracker({ traceId, mode, pollIntervalMs = 2500, seedHint = '', compact = false }: ThinkingTrackerProps) {
  const { events, loading } = useTraceEvents({ traceId, pollIntervalMs, enabled: Boolean(traceId) });

  const simulatedEvents = useMemo(() => {
    if (mode !== 'demo' || !traceId || events.length > 0) return [];
    const base = hashSeed(`${seedHint}:${traceId}`);
    const count = 2 + (base % STEPS.length);
    return STEPS.slice(0, Math.min(STEPS.length, count));
  }, [events.length, mode, seedHint, traceId]);

  const completedSteps = useMemo(() => {
    const set = new Set<StepKey>();
    events.forEach((event) => set.add(eventToStep(event.event_name)));
    simulatedEvents.forEach((step) => set.add(step));
    return set;
  }, [events, simulatedEvents]);

  const activeStepIndex = Math.min(completedSteps.size, STEPS.length - 1);

  return (
    <section className={`rounded-lg border border-white/10 bg-slate-950/70 ${compact ? 'p-2' : 'p-3'}`} aria-label="thinking-tracker">
      <div className={`flex items-center justify-between text-xs text-slate-300 ${compact ? 'mb-1' : 'mb-2'}`}>
        <span>Thinking · {mode === 'demo' ? 'Demo mode' : 'Live mode'}</span>
        <button
          type="button"
          onClick={() => {
            if (!traceId || typeof navigator === 'undefined' || !navigator.clipboard) return;
            void navigator.clipboard.writeText(traceId);
          }}
          className="text-[11px] text-slate-400"
        >
          trace_id: {traceId ?? '—'}
        </button>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {STEPS.map((step, index) => {
          const done = completedSteps.has(step);
          const active = !done && index === activeStepIndex;
          return (
            <div key={step} className={`rounded border px-2 py-1 text-center text-[11px] ${done ? 'border-emerald-400/40 text-emerald-200' : active ? 'border-cyan-400/40 text-cyan-200' : 'border-slate-700 text-slate-400'}`}>
              {step}
            </div>
          );
        })}
      </div>
      <p className={`text-[11px] text-slate-400 ${compact ? 'mt-1' : 'mt-2'}`}>
        {events.length > 0
          ? `${events.length} events observed.`
          : mode === 'demo'
            ? 'Deterministic demo thinking shown while live events are unavailable.'
            : loading
              ? 'Waiting for events…'
              : 'Waiting for events.'}
      </p>
    </section>
  );
}
