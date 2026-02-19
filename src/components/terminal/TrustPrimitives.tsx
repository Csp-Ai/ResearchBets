'use client';

import React from 'react';
import { copyToClipboard } from './copyToast';

export function TraceBadge({ traceId }: { traceId: string | null }) {
  if (!traceId) return <span className="rounded border border-slate-700 px-2 py-0.5 text-xs">No trace</span>;

  return (
    <button
      type="button"
      onClick={() => {
        void copyToClipboard(traceId);
      }}
      className="rounded border border-cyan-700/80 bg-cyan-950/40 px-2 py-0.5 font-mono text-xs text-cyan-200"
      title="Copy trace id"
    >
      trace:{traceId.slice(0, 12)}…
    </button>
  );
}

export function ProvenanceChip({ mode, updatedAt }: { mode: 'Live' | 'Demo'; updatedAt?: string | null }) {
  const age = updatedAt ? Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 1000)) : null;
  return (
    <span className="rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-300">
      {mode} {age !== null ? `· ${age}s ago` : ''}
    </span>
  );
}

export function ConfidenceMeter({ score }: { score: number | null }) {
  const bounded = score === null ? 0 : Math.min(1, Math.max(0, score));
  const label = score === null ? 'Not provided' : bounded < 0.4 ? 'Weak' : bounded < 0.75 ? 'Moderate' : 'Strong';
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-400">
        <span>Confidence</span>
        <span>{label}</span>
      </div>
      <div className="h-2 w-full rounded bg-slate-800">
        <div className="h-2 rounded bg-emerald-500" style={{ width: `${bounded * 100}%` }} />
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: 'waiting' | 'running' | 'complete' | 'error' }) {
  const style: Record<typeof status, string> = {
    waiting: 'border-slate-600 text-slate-300',
    running: 'border-cyan-600 text-cyan-300',
    complete: 'border-emerald-600 text-emerald-300',
    error: 'border-rose-600 text-rose-300',
  };
  return <span className={`rounded border px-2 py-0.5 text-xs ${style[status]}`}>{status}</span>;
}
