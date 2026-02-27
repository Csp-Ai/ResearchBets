'use client';

import React, { useMemo } from 'react';
import { useTraceEvents } from '@/src/hooks/useTraceEvents';

type StepKey = 'Scout' | 'Stats' | 'Line' | 'Risk' | 'Verdict';
const STEPS: StepKey[] = ['Scout', 'Stats', 'Line', 'Risk', 'Verdict'];

const eventToStep = (eventName: string): StepKey => {
  if (eventName.includes('slip_submitted') || eventName.includes('ui_action_started')) return 'Scout';
  if (eventName.includes('slip_extracted') || eventName.includes('data_normalized')) return 'Stats';
  if (eventName.includes('odds') || eventName.includes('delta_computed') || eventName.includes('line')) return 'Line';
  if (eventName.includes('model') || eventName.includes('risk') || eventName.includes('consensus')) return 'Risk';
  return 'Verdict';
};

export function RunStatusDetails({ traceId, pollIntervalMs = 2500 }: { traceId?: string; pollIntervalMs?: number }) {
  const { events } = useTraceEvents({ traceId, pollIntervalMs, enabled: Boolean(traceId) });
  const completedSteps = useMemo(() => {
    const set = new Set<StepKey>();
    events.forEach((event) => set.add(eventToStep(event.event_name)));
    return set;
  }, [events]);
  const activeStepIndex = Math.min(completedSteps.size, STEPS.length - 1);

  return (
    <div className="mt-2 grid grid-cols-5 gap-1">
      {STEPS.map((step, index) => {
        const done = completedSteps.has(step);
        const active = !done && index === activeStepIndex;
        return <div key={step} className={`rounded border px-2 py-1 text-center text-[11px] ${done ? 'border-emerald-400/40 text-emerald-200' : active ? 'border-cyan-400/40 text-cyan-200' : 'border-slate-700 text-slate-400'}`}>{step}</div>;
      })}
    </div>
  );
}
