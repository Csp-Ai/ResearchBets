'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { toBettorEventLabel, toBettorReason } from '@/src/core/copy/bettorSafeCopy';
import { useTraceEvents } from '@/src/hooks/useTraceEvents';

type Stage = 'Submitted' | 'Extracting' | 'Enriching' | 'Scoring' | 'Verdict' | 'Saved';
const STAGES: Stage[] = ['Submitted', 'Extracting', 'Enriching', 'Scoring', 'Verdict', 'Saved'];

type VolatilityDriver = 'Blowout risk' | 'Minutes cap' | 'Pace crash' | 'Foul risk' | 'Unknown';

const stageByEvent: Record<string, Stage> = {
  slip_submitted: 'Submitted',
  slip_extracted: 'Extracting',
  slip_enrich_started: 'Enriching',
  slip_enrich_done: 'Enriching',
  slip_scored: 'Scoring',
  slip_verdict_ready: 'Verdict',
  slip_persisted: 'Saved',
};

function agoLabel(timestamp?: string): string {
  if (!timestamp) return 'Waiting for updates';
  const deltaSeconds = Math.max(0, Math.round((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (deltaSeconds < 3) return 'Updated just now';
  return `Updated ${deltaSeconds}s ago`;
}

function deriveVolatilityDriver(events: Array<{ payload?: Record<string, unknown> }>): { driver: VolatilityDriver; minutesRisk?: 'medium' } {
  for (const event of [...events].reverse()) {
    const payload = event.payload ?? {};
    const marginCandidate = payload.score_margin ?? payload.scoreMargin ?? payload.margin;
    const margin = typeof marginCandidate === 'number' ? Math.abs(marginCandidate) : Number.NaN;
    if (Number.isFinite(margin)) {
      if (margin >= 15) return { driver: 'Blowout risk' };
      if (margin <= 4) return { driver: 'Foul risk' };
      if (margin <= 8) return { driver: 'Pace crash' };
    }

    const deltaCandidate = payload.leg_delta ?? payload.legDelta;
    const timeCandidate = payload.clock_minutes_remaining ?? payload.minutes_remaining ?? payload.minutesRemaining;
    const delta = typeof deltaCandidate === 'number' ? Math.abs(deltaCandidate) : Number.NaN;
    const minutesRemaining = typeof timeCandidate === 'number' ? timeCandidate : Number.NaN;
    if (Number.isFinite(delta) && Number.isFinite(minutesRemaining) && delta <= 1.5 && minutesRemaining <= 10) {
      return { driver: 'Minutes cap', minutesRisk: 'medium' };
    }
  }

  return { driver: 'Unknown' };
}

export function DuringStageTracker({ trace_id, mode, compact = false }: { trace_id?: string; mode: 'live' | 'cache' | 'demo'; compact?: boolean }) {
  const nervous = useNervousSystem();
  const [proofOpen, setProofOpen] = useState(false);
  const { events } = useTraceEvents({ trace_id, enabled: Boolean(trace_id), pollIntervalMs: compact ? 3000 : 2500, limit: 30 });

  const latestEvent = events.at(-1);
  const latestStage = latestEvent ? stageByEvent[latestEvent.event_name] : undefined;
  const activeIndex = latestStage ? STAGES.indexOf(latestStage) : mode === 'live' ? 0 : 1;

  const safeFallbackCopy = mode === 'demo'
    ? 'Demo mode (feeds off)'
    : mode === 'cache'
      ? 'Using cached slate'
      : 'Warming up';

  const proofRows = useMemo(() => [...events].slice(-5).reverse(), [events]);
  const volatility = useMemo(() => deriveVolatilityDriver(events), [events]);

  if (!trace_id) {
    return (
      <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
        <p className="text-sm font-medium text-slate-100">Attach to run</p>
        <p className="text-xs text-slate-300">Connect this view to a run to watch DURING stages update in real time.</p>
        <div className="mt-2 flex gap-2 text-xs">
          <Link href={appendQuery(nervous.toHref('/research'), {})} className="rounded border border-cyan-300/50 px-2 py-1 text-cyan-100">Open latest run</Link>
          <Link href={appendQuery(nervous.toHref('/slip'), { sample: '1' })} className="rounded border border-white/20 px-2 py-1">Run sample slip</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-3" data-testid="during-stage-tracker">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-100">DURING Stage Tracker</p>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded border border-white/20 px-2 py-0.5">{mode.toUpperCase()}</span>
          <span className="rounded border border-white/15 bg-white/5 px-2 py-0.5 text-slate-200">Volatility driver: {volatility.driver}{volatility.minutesRisk ? ` · Minutes risk: ${volatility.minutesRisk}` : ''}</span>
          <span className="text-slate-300">{latestEvent ? agoLabel(latestEvent.created_at) : safeFallbackCopy}</span>
        </div>
      </div>

      <div className={`mt-2 grid ${compact ? 'grid-cols-3' : 'grid-cols-6'} gap-1`}>
        {STAGES.map((stage, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          return (
            <div key={stage} className={`rounded border px-2 py-1 text-center text-[11px] ${done ? 'border-emerald-400/40 text-emerald-200' : active ? 'border-cyan-400/40 text-cyan-200' : 'border-slate-700 text-slate-400'}`}>
              {stage}
            </div>
          );
        })}
      </div>

      {events.length === 0 ? <p className="mt-2 text-xs text-slate-300">{safeFallbackCopy}. {toBettorReason(mode === 'live' ? 'provider_unavailable' : 'cache_hit')}</p> : null}

      <div className="mt-2">
        <button type="button" className="text-xs text-cyan-200 underline" onClick={() => setProofOpen((prev) => !prev)}>
          {proofOpen ? 'Hide proof' : 'Show proof'}
        </button>
        {proofOpen ? (
          <ul className="mt-2 space-y-1 text-xs text-slate-300">
            {proofRows.length === 0 ? <li>{safeFallbackCopy}</li> : proofRows.map((event) => <li key={`${event.event_name}-${event.created_at}`}>{toBettorEventLabel(event.event_name)} · {agoLabel(event.created_at)}</li>)}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
