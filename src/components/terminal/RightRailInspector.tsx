'use client';

import React from 'react';
import { useMemo, useState } from 'react';

import { EmptyState, InlineError } from './AsyncState';
import { copyToClipboard } from './copyToast';
import { ConfidenceMeter, ProvenanceChip, TraceBadge } from './TrustPrimitives';

type AgentDetail = { id: string; snippet: string; timestamp?: string };

export type InspectorSummary = {
  confidence: number | null;
  assumptions: string[];
  sources: string[];
  agents: AgentDetail[];
  updatedAt?: string;
  provenance: 'Live' | 'Demo';
};

export function RightRailInspector({
  traceId,
  runId,
  sessionId,
  loading,
  error,
  summary,
}: {
  traceId: string | null;
  runId: string | null;
  sessionId: string | null;
  loading?: boolean;
  error?: string | null;
  summary?: InspectorSummary;
}) {
  const [openAgent, setOpenAgent] = useState<AgentDetail | null>(null);

  const safeSummary = useMemo<InspectorSummary>(
    () =>
      summary ?? {
        confidence: null,
        assumptions: [],
        sources: [],
        agents: [],
        provenance: traceId ? 'Live' : 'Demo',
      },
    [summary, traceId]
  );

  if (!traceId) {
    return (
      <EmptyState
        title="Trust Inspector"
        description="No trace selected. Run research to surface confidence, assumptions, and evidence."
      />
    );
  }

  return (
    <aside className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
      <section>
        <h3 className="text-sm font-semibold">Run Context</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <TraceBadge traceId={traceId} />
          <ProvenanceChip mode={safeSummary.provenance} updatedAt={safeSummary.updatedAt} />
        </div>
        <div className="mt-2 space-y-1 text-xs text-slate-300">
          {runId ? <CopyRow label="run" value={runId} /> : null}
          {sessionId ? <CopyRow label="session" value={sessionId} /> : null}
          {safeSummary.updatedAt ? <p>Last updated {new Date(safeSummary.updatedAt).toLocaleString()}</p> : null}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Confidence</h3>
        <ConfidenceMeter score={safeSummary.confidence} />
        <p className="text-xs text-slate-500">Agreement (coming soon)</p>
      </section>

      <InspectorList title="Assumptions" rows={safeSummary.assumptions} emptyText="No assumptions recorded" />
      <InspectorList title="Sources / Evidence" rows={safeSummary.sources} emptyText="No source evidence provided" />

      <section>
        <h3 className="text-sm font-semibold">Agents</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {safeSummary.agents.length === 0 ? (
            <p className="text-xs text-slate-500">No agent activity</p>
          ) : (
            safeSummary.agents.map((agent) => (
              <button
                type="button"
                key={`${agent.id}-${agent.timestamp ?? ''}`}
                onClick={() => setOpenAgent(agent)}
                className="rounded border border-slate-700 px-2 py-1 text-xs"
              >
                {agent.id}
              </button>
            ))
          )}
        </div>
      </section>

      {loading ? <p className="text-xs text-slate-500">Loading inspector telemetry…</p> : null}
      {error ? <InlineError message="Unable to load trust telemetry" details={error} /> : null}

      {openAgent ? (
        <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs">
          <div className="mb-2 flex items-center justify-between">
            <strong>{openAgent.id}</strong>
            <button type="button" onClick={() => setOpenAgent(null)} className="rounded border border-slate-700 px-1.5 py-0.5">Close</button>
          </div>
          <pre className="max-h-36 overflow-auto text-slate-300">{openAgent.snippet}</pre>
          {openAgent.timestamp ? <p className="mt-2 text-slate-500">{openAgent.timestamp}</p> : null}
        </div>
      ) : null}
    </aside>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        void copyToClipboard(value);
      }}
      className="block rounded border border-slate-700 px-2 py-1 font-mono"
    >
      {label}:{value.slice(0, 16)}…
    </button>
  );
}

function InspectorList({ title, rows, emptyText }: { title: string; rows: string[]; emptyText: string }) {
  return (
    <section>
      <h3 className="text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">{emptyText}</p>
      ) : (
        <ul className="mt-2 space-y-1 text-xs text-slate-300">
          {rows.map((row, idx) => (
            <li key={`${row}-${idx}`} className="rounded border border-slate-800 bg-slate-950/60 px-2 py-1">
              {row}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
