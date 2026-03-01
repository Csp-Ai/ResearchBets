'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import type { QuerySpine } from '@/src/core/nervous/spine';
import { useTraceEvents } from '@/src/hooks/useTraceEvents';

const PHASES = ['Extract', 'Research', 'Verdict', 'Track', 'Review'] as const;

const phaseByEvent: Record<string, number> = {
  slip_submitted: 0,
  slip_extracted: 1,
  slip_enrich_started: 1,
  slip_scored: 2,
  slip_verdict_ready: 2,
  slip_persisted: 3,
  postmortem_completed: 4,
};

function lastUpdateCopy(timestamp?: string): string {
  if (!timestamp) return 'Last update unavailable';
  const age = Math.max(0, Math.round((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (age < 3) return 'Last update just now';
  return `Last update ${age}s ago`;
}

export function RunPulseStrip({ traceId, spine }: { traceId?: string; spine: QuerySpine }) {
  const nervous = useNervousSystem();
  const { events } = useTraceEvents({ trace_id: traceId, enabled: Boolean(traceId), limit: 20, pollIntervalMs: 2500 });

  const sampleRunHref = appendQuery(nervous.toHref('/stress-test', { ...spine, mode: 'demo' }), { sample: '1' });

  const latestEvent = events.at(-1);
  const activeIndex = useMemo(() => {
    if (!traceId) return -1;
    if (!latestEvent) return 0;
    return phaseByEvent[latestEvent.event_name] ?? 1;
  }, [latestEvent, traceId]);

  if (!traceId) {
    return (
      <section className="rounded-xl border border-white/10 bg-slate-900/55 px-3 py-2.5" data-testid="run-pulse-dormant">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-slate-100">Run Pulse</p>
            <p className="text-xs text-slate-400">No active run yet.</p>
          </div>
          <Link href={sampleRunHref} className="rounded-md border border-white/20 px-2.5 py-1.5 text-xs text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">See a sample run</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/55 px-3 py-2.5" data-testid="run-pulse-active">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-100">Run Pulse</p>
        <p className="text-xs text-slate-300">{lastUpdateCopy(latestEvent?.created_at)}</p>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1">
        {PHASES.map((phase, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          return (
            <span
              key={phase}
              className={`rounded border px-1.5 py-1 text-center text-[10px] ${done ? 'border-emerald-300/50 text-emerald-200' : active ? `${events.length > 0 ? 'animate-pulse ' : ''}border-cyan-300/60 text-cyan-100` : 'border-white/10 text-slate-500'}`}
            >
              {phase}
            </span>
          );
        })}
      </div>
    </section>
  );
}
