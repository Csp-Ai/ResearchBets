'use client';

import React from 'react';
import type { ControlPlaneEvent } from '@/src/components/AgentNodeGraph';
import { asRecord, formatAgeLabel } from '@/src/components/terminal/eventDerivations';
import { EmptyStateCard } from '@/src/components/shared/EmptyStateCard';

function hasWarning(event: ControlPlaneEvent): boolean {
  const payload = asRecord(event.payload);
  if (event.event_name.toLowerCase().includes('warn')) return true;
  return Boolean(payload.warning) || Boolean(payload.warnings) || payload.level === 'warning';
}

function isTerminalEvent(event: ControlPlaneEvent): boolean {
  const name = event.event_name.toLowerCase();
  return name.includes('complete') || name.includes('completed') || name.includes('finished') || name.includes('saved') || name.includes('verdict');
}

function deriveStatus(events: ControlPlaneEvent[]): 'No evidence' | 'Running' | 'Complete' {
  if (events.length === 0) return 'No evidence';
  const last = events[events.length - 1];
  if (!last) return 'No evidence';
  if (isTerminalEvent(last)) return 'Complete';
  const updatedAt = new Date(last.created_at ?? 0).getTime();
  if (Number.isFinite(updatedAt) && Date.now() - updatedAt <= 2 * 60 * 1000) return 'Running';
  return 'Complete';
}

export function ProgressStrip({ events }: { events: ControlPlaneEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyStateCard
        title="No evidence"
        guidance="No evidence yet — run research to generate a trace."
        primaryCta={{ label: 'Run Research', href: '/research' }}
      />
    );
  }

  const warnings = events.filter(hasWarning).length;
  const lastUpdated = events.at(-1)?.created_at;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/75 px-3 py-2 text-xs text-slate-300">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded border border-slate-700 px-2 py-1">Status: {deriveStatus(events)}</span>
        <span className="rounded border border-slate-700 px-2 py-1">{formatAgeLabel(lastUpdated)}</span>
        <span className="rounded border border-slate-700 px-2 py-1">Events: {events.length}</span>
        <span className="rounded border border-slate-700 px-2 py-1">Warnings: {warnings}</span>
      </div>
    </section>
  );
}
