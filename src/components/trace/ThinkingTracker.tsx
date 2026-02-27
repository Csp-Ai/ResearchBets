'use client';

import React from 'react';
import { RunStatusDetails } from './RunStatusDetails';

type ThinkingTrackerProps = {
  traceId?: string;
  mode: 'live' | 'cache' | 'demo';
  pollIntervalMs?: number;
  compact?: boolean;
  expanded?: boolean;
};

export function ThinkingTracker({ traceId, pollIntervalMs = 2500, expanded = false }: ThinkingTrackerProps) {
  if (!expanded) return null;

  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/70 p-2" aria-label="thinking-tracker-details">
      <RunStatusDetails traceId={traceId} pollIntervalMs={pollIntervalMs} />
    </section>
  );
}
