'use client';

import React from 'react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { EmptyState, InlineError } from './AsyncState';
import { copyToClipboard } from './copyToast';
import type { DerivedInspectorSummary, InspectorAgentDetail } from './eventDerivations';
import { ConfidenceMeter, ProvenanceChip, TraceBadge } from './TrustPrimitives';

export type InspectorSummary = DerivedInspectorSummary;

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
  const [openAgent, setOpenAgent] = useState<InspectorAgentDetail | null>(null);

  const safeSummary = useMemo<InspectorSummary>(
    () =>
      summary ?? {
        confidence: null,
        assumptions: [],
        sources: [],
        agents: [],
        modelVersions: [],
        provenance: traceId ? 'Live' : 'Demo',
        hasErrorEvents: false,
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
      </section>

      <InspectorList title="Assumptions" rows={safeSummary.assumptions} emptyText="No assumptions recorded" />
      <InspectorList title="Sources / Evidence" rows={safeSummary.sources} emptyText="No source evidence provided" linkify />

      <section>
        <h3 className="text-sm font-semibold">Model / Agent Context</h3>
        <div className="mt-2 space-y-2 text-xs text-slate-300">
          <p>Models: {safeSummary.modelVersions.length > 0 ? safeSummary.modelVersions.join(', ') : 'n/a'}</p>
          <div className="flex flex-wrap gap-2">
            {safeSummary.agents.length === 0 ? (
              <p className="text-xs text-slate-500">No agent activity</p>
            ) : (
              safeSummary.agents.map((agent) => (
                <button
                  type="button"
                  key={`${agent.id}-${agent.timestamp ?? ''}`}
                  onClick={() => setOpenAgent(agent)}
                  className="rounded border border-slate-700 px-2 py-1 text-xs hover:border-cyan-500/60"
                >
                  {agent.id}
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold">Quality Flags</h3>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {safeSummary.confidence === null ? (
            <span className="rounded border border-amber-600/60 px-2 py-0.5 text-amber-200">No confidence provided</span>
          ) : null}
          {safeSummary.assumptions.length === 0 ? (
            <span className="rounded border border-slate-600 px-2 py-0.5 text-slate-300">No assumptions recorded</span>
          ) : null}
          {safeSummary.hasErrorEvents ? (
            <Link href={`/traces/${encodeURIComponent(traceId)}?errors=1`} className="rounded border border-rose-600/70 px-2 py-0.5 text-rose-200">
              Errors detected
            </Link>
          ) : null}
          {safeSummary.confidence !== null && safeSummary.assumptions.length > 0 && !safeSummary.hasErrorEvents ? (
            <span className="rounded border border-emerald-700/60 px-2 py-0.5 text-emerald-200">No immediate quality warnings</span>
          ) : null}
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
          <div className="space-y-1 text-slate-300">
            <p>event: {openAgent.eventName}</p>
            <p>timestamp: {openAgent.timestamp ?? 'n/a'}</p>
            <p>confidence: {openAgent.confidence ?? 'n/a'}</p>
            <p>assumptions: {openAgent.assumptions.length > 0 ? openAgent.assumptions.join('; ') : 'n/a'}</p>
            <p>sources: {openAgent.sources.length > 0 ? openAgent.sources.join('; ') : 'n/a'}</p>
          </div>
          <pre className="mt-2 max-h-40 overflow-auto text-slate-300">{JSON.stringify(openAgent.raw, null, 2)}</pre>
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

function InspectorList({ title, rows, emptyText, linkify }: { title: string; rows: string[]; emptyText: string; linkify?: boolean }) {
  return (
    <section>
      <h3 className="text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">{emptyText}</p>
      ) : (
        <ul className="mt-2 space-y-1 text-xs text-slate-300">
          {rows.map((row, idx) => (
            <li key={`${row}-${idx}`} className="rounded border border-slate-800 bg-slate-950/60 px-2 py-1 break-all">
              {linkify && row.startsWith('http') ? (
                <a href={row} target="_blank" rel="noreferrer" className="text-cyan-300 underline">
                  {row}
                </a>
              ) : (
                row
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
