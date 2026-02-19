'use client';

import React from 'react';
import Link from 'next/link';

import type { ControlPlaneEvent } from '@/src/components/AgentNodeGraph';

import { EmptyState } from './AsyncState';
import { copyToClipboard } from './copyToast';
import { ConfidenceMeter, StatusBadge, TraceBadge } from './TrustPrimitives';
import { asRecord, deriveInspectorSummary, deriveRunStatus, formatAgeLabel } from './eventDerivations';

export function RunHeaderStrip({
  traceId,
  events,
  onRefresh,
  viewTraceHref,
}: {
  traceId: string | null;
  events: ControlPlaneEvent[];
  onRefresh?: () => void;
  viewTraceHref?: string;
}) {
  if (!traceId) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2">
        <EmptyState title="No active run" description="Start an ingest + research run to populate terminal telemetry." action={<Link href="/ingest" className="rounded border border-cyan-700/70 px-2 py-1 text-cyan-200">Go to Ingest</Link>} />
      </div>
    );
  }

  const summary = deriveInspectorSummary(events);
  const status = deriveRunStatus(events);
  const uniqueAgents = new Set(
    events
      .map((event) => {
        const payload = asRecord(event.payload);
        return typeof payload.agent_id === 'string' ? payload.agent_id : null;
      })
      .filter((value): value is string => Boolean(value))
  );

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/85 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
        <TraceBadge traceId={traceId} />
        <StatusBadge status={status} />
        <span className="rounded border border-slate-700 px-2 py-0.5">{formatAgeLabel(summary.updatedAt)}</span>
        <span className="rounded border border-slate-700 px-2 py-0.5">agents {uniqueAgents.size}</span>
        <span className="rounded border border-slate-700 px-2 py-0.5">events {events.length}</span>

        {viewTraceHref ? (
          <Link href={viewTraceHref} className="rounded border border-cyan-700/70 px-2 py-0.5 text-cyan-200 hover:bg-cyan-950/40">
            View Trace
          </Link>
        ) : null}

        <button type="button" onClick={() => void copyToClipboard(traceId)} className="rounded border border-slate-700 px-2 py-0.5 hover:border-cyan-500/60">
          Copy Trace
        </button>

        {onRefresh ? (
          <button type="button" onClick={onRefresh} className="rounded border border-slate-700 px-2 py-0.5 hover:border-cyan-500/60">
            Refresh
          </button>
        ) : null}
      </div>
      <div className="mt-2 max-w-[240px]">
        <ConfidenceMeter score={summary.confidence} />
      </div>
    </section>
  );
}
