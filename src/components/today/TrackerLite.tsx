'use client';

import React, { useMemo, useState } from 'react';

export type TrackerStepState = 'queued' | 'running' | 'done';

export type TrackerStep = {
  label: string;
  state: TrackerStepState;
};

export type TrackerEvent = {
  id: string;
  label: string;
};

type TrackerLiteProps = {
  visible: boolean;
  traceId?: string;
  steps: TrackerStep[];
  events: TrackerEvent[];
  running: boolean;
};

const stateGlyph: Record<TrackerStepState, string> = {
  queued: '○',
  running: '◌',
  done: '✓'
};

export function TrackerLite({ visible, traceId, steps, events, running }: TrackerLiteProps) {
  const [expanded, setExpanded] = useState(false);
  const eventPreview = useMemo(() => events.slice(0, 3), [events]);

  if (!visible) return null;

  return (
    <section aria-label="tracker-lite" className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Run tracker</p>
        <span className="text-xs text-slate-400">{running ? 'Running' : 'Completed'}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <code className="truncate text-xs text-slate-300">trace_id: {traceId ?? '—'}</code>
        <button
          type="button"
          onClick={() => {
            if (!traceId || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
            void navigator.clipboard.writeText(traceId);
          }}
          className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300"
        >
          Copy
        </button>
      </div>

      <div className="mt-3 space-y-1">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center gap-2 text-sm">
            <span className={`text-xs ${step.state === 'done' ? 'text-emerald-300' : step.state === 'running' ? 'text-cyan-300' : 'text-slate-500'}`}>
              {stateGlyph[step.state]}
            </span>
            <span className={step.state === 'queued' ? 'text-slate-400' : 'text-slate-200'}>{step.label}</span>
          </div>
        ))}
      </div>

      <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-3 text-xs text-slate-400 underline-offset-2 hover:underline">
        {expanded ? 'Hide' : 'Show'} event feed
      </button>
      {expanded ? (
        <div className="mt-2 space-y-1 text-xs text-slate-300">
          {eventPreview.length > 0 ? eventPreview.map((event) => <p key={event.id}>• {event.label}</p>) : <p>• No events yet.</p>}
        </div>
      ) : null}
    </section>
  );
}
