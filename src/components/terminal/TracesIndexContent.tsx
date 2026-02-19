'use client';

import React, { useState } from 'react';
import Link from 'next/link';

import { EmptyState } from './AsyncState';
import { PageHeader } from './PageHeader';

export function TracesIndexContent() {
  const [traceId, setTraceId] = useState('');

  return (
    <div className="space-y-4">
      <PageHeader title="Traces" subtitle="Open a trace to inspect event and agent telemetry." />
      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex gap-2">
          <input
            value={traceId}
            onChange={(event) => setTraceId(event.target.value)}
            placeholder="Enter trace id"
            className="flex-1 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <Link href={traceId ? `/traces/${encodeURIComponent(traceId)}` : '/traces'} className="rounded bg-cyan-700 px-3 py-2 text-sm">
            Open trace
          </Link>
        </div>
        {!traceId ? (
          <div className="mt-3">
            <EmptyState title="No trace selected" description="Paste a trace_id from dashboard/research to inspect the full event tape." />
          </div>
        ) : null}
      </section>
    </div>
  );
}
