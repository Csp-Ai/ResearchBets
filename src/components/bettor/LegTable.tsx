'use client';

import React from 'react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { ControlPlaneEvent } from '../AgentNodeGraph';

import { deriveLegInsights, type SlipLeg } from './bettorDerivations';

export function removeLegAtIndex(legs: SlipLeg[], index: number): SlipLeg[] {
  return legs.filter((_, current) => current !== index);
}

type LegTableProps = {
  legs: SlipLeg[];
  events: ControlPlaneEvent[];
  traceId?: string;
  onLegsChange: (legs: SlipLeg[]) => void;
};

export function LegTable({ legs, events, traceId, onLegsChange }: LegTableProps) {
  const [openWhyLegId, setOpenWhyLegId] = useState<string | null>(null);
  const rows = useMemo(() => deriveLegInsights(events, legs), [events, legs]);

  if (legs.length === 0) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h3 className="text-lg font-semibold">Leg plan</h3>
        <p className="mt-1 text-sm text-slate-400">No legs extracted yet. Start with slip ingest to build a ranked decision board.</p>
        <Link className="mt-3 inline-flex rounded bg-cyan-600 px-3 py-2 text-xs font-medium" href="/ingest">
          Paste slip
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h3 className="text-lg font-semibold">Ranked leg table</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-slate-400">
            <tr>
              <th className="pb-2">Leg</th><th className="pb-2">Line / odds</th><th className="pb-2">Trend</th><th className="pb-2">Evidence</th><th className="pb-2">Volatility</th><th className="pb-2">Notes</th><th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.legId} className="border-t border-slate-800 align-top">
                <td className="py-2 pr-2">{row.legLabel}</td>
                <td className="py-2 pr-2">{row.lineOdds}</td>
                <td className="py-2 pr-2">{row.trend}</td>
                <td className="py-2 pr-2">{row.evidenceStrength}</td>
                <td className="py-2 pr-2">{row.volatility}</td>
                <td className="py-2 pr-2">{row.note}</td>
                <td className="py-2 pr-2">
                  <div className="flex flex-col gap-1">
                    <button type="button" onClick={() => onLegsChange(removeLegAtIndex(legs, index))} className="rounded border border-rose-500/60 px-2 py-1">Remove</button>
                    <button type="button" onClick={() => setOpenWhyLegId(openWhyLegId === row.legId ? null : row.legId)} className="rounded border border-slate-600 px-2 py-1">Why</button>
                    <Link href={`/traces/${encodeURIComponent(traceId ?? '')}?event_name=${encodeURIComponent(row.relatedEvents[0]?.event_name ?? '')}&agent_id=${encodeURIComponent(String(row.relatedEvents[0]?.payload?.agent_id ?? ''))}`} className="rounded border border-cyan-700 px-2 py-1">Trace</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {openWhyLegId ? (
        <aside className="mt-3 rounded border border-slate-700 bg-slate-950/70 p-3 text-xs">
          <p className="font-medium">Why this leg?</p>
          <ul className="mt-2 space-y-1 text-slate-300">
            {rows
              .find((row) => row.legId === openWhyLegId)
              ?.relatedEvents.slice(0, 3)
              .map((event) => <li key={`${event.event_name}-${event.created_at}`}>{event.event_name.replaceAll('_', ' ')}</li>)}
          </ul>
        </aside>
      ) : null}
    </section>
  );
}
