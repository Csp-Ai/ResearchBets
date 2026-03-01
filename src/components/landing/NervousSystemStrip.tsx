'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import type { QuerySpine } from '@/src/core/nervous/spine';
import { useTraceEvents } from '@/src/hooks/useTraceEvents';

const STAGES = ['Stage', 'Analyze', 'During', 'After'] as const;

const stageByEvent: Record<string, number> = {
  slip_submitted: 0,
  slip_extracted: 0,
  slip_enrich_started: 1,
  slip_scored: 1,
  slip_verdict_ready: 1,
  slip_persisted: 2,
  live_tick_ingested: 2,
  postmortem_started: 3,
  postmortem_completed: 3,
};

function updatedLabel(createdAt?: string): string {
  if (!createdAt) return 'Updated recently';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 1000));
  if (seconds < 15) return 'Updated just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return `Updated ${seconds}s ago`;
  return `Updated ${minutes}m ago`;
}

export function NervousSystemStrip({ traceId, spine }: { traceId?: string; spine: QuerySpine }) {
  const nervous = useNervousSystem();
  const { events } = useTraceEvents({ trace_id: traceId, enabled: Boolean(traceId), limit: 24, pollIntervalMs: 2500 });
  const sampleRunHref = appendQuery(nervous.toHref('/stress-test', { ...spine, mode: 'demo' }), { sample: '1' });

  const latestEvent = events.at(-1);
  const activeStage = useMemo(() => {
    if (!traceId) return -1;
    if (!latestEvent) return 0;
    return stageByEvent[latestEvent.event_name] ?? 1;
  }, [latestEvent, traceId]);

  const [pulse, setPulse] = useState(false);
  const lastKey = useRef<string>('');

  useEffect(() => {
    if (!latestEvent) return;
    const key = `${latestEvent.event_name}:${latestEvent.created_at}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    setPulse(true);
    const timer = window.setTimeout(() => setPulse(false), 800);
    return () => window.clearTimeout(timer);
  }, [latestEvent]);

  if (!traceId) {
    return (
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-3 sm:p-4" data-testid="nervous-strip-dormant">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-100">Nervous System</p>
            <p className="text-xs text-slate-400">No active run yet.</p>
          </div>
          <Link href={sampleRunHref} className="rounded-md border border-white/20 px-2.5 py-1.5 text-xs text-slate-100 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">Run sample trace</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-3 sm:p-4" data-testid="nervous-strip-active">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-100">Nervous System</p>
          <span className={`rounded-full border px-2 py-0.5 text-[11px] ${pulse ? 'border-cyan-300/60 text-cyan-100' : 'border-white/20 text-slate-300'}`}>
            {STAGES[Math.max(0, activeStage)]}
          </span>
        </div>
        <p className="text-xs text-slate-300">{updatedLabel(latestEvent?.created_at)}</p>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {STAGES.map((stage, index) => {
          const done = index < activeStage;
          const active = index === activeStage;
          return (
            <span
              key={stage}
              className={`rounded border px-2 py-1 text-center text-[11px] ${done ? 'border-emerald-300/60 text-emerald-200' : active ? `${pulse ? 'animate-pulse ' : ''}border-cyan-300/60 text-cyan-100` : 'border-white/10 text-slate-500'}`}
            >
              {stage}
            </span>
          );
        })}
      </div>
    </section>
  );
}
