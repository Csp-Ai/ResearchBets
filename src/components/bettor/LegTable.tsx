'use client';

import React from 'react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { EmptyStateCard } from '../shared/EmptyStateCard';

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
  const strongest = rows[0]?.legId;
  const weakest = rows.at(-1)?.legId;

  if (legs.length === 0) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h3 className="text-lg font-semibold">Leg plan</h3>
        <div className="mt-2">
          <EmptyStateCard
            title="No legs extracted yet"
            guidance="Paste a slip to create ranked legs, then rerun research for evidence-backed ordering."
            primaryCta={{ label: 'Paste slip', href: '/ingest' }}
            secondaryCta={{ label: 'Go to Ingest', href: '/ingest' }}
          />
        </div>
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
              <th className="pb-2">Leg</th><th className="pb-2">Line / odds</th><th className="pb-2">Trend</th><th className="pb-2">Signals</th><th className="pb-2">Notes</th><th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const highlight = row.legId === strongest ? 'bg-emerald-500/10' : row.legId === weakest ? 'bg-rose-500/10' : '';
              return (
                <tr key={row.legId} className={`border-t border-slate-800 align-top ${highlight}`}>
                  <td className="py-2 pr-2">{row.legLabel}</td>
                  <td className="py-2 pr-2">{row.lineOdds}</td>
                  <td className="py-2 pr-2">{row.trend}</td>
                  <td className="py-2 pr-2"><div className="flex gap-1"><span className="rounded border border-cyan-500/40 px-1.5 py-0.5">Evidence {row.evidenceStrength}</span><span className="rounded border border-amber-500/40 px-1.5 py-0.5">Volatility {row.volatility}</span></div></td>
                  <td className="py-2 pr-2">{row.note}</td>
                  <td className="py-2 pr-2">
                    <div className="flex flex-col gap-1">
                      <button type="button" onClick={() => onLegsChange(removeLegAtIndex(legs, index))} className="rounded border border-rose-500/60 px-2 py-1">Remove + Rerun</button>
                      <button type="button" onClick={() => setOpenWhyLegId(openWhyLegId === row.legId ? null : row.legId)} className="rounded border border-slate-600 px-2 py-1">Insights</button>
                      <Link href={`/traces/${encodeURIComponent(traceId ?? '')}?event_name=${encodeURIComponent(row.relatedEvents[0]?.event_name ?? '')}&agent_id=${encodeURIComponent(String(row.relatedEvents[0]?.payload?.agent_id ?? ''))}`} className="rounded border border-cyan-700 px-2 py-1">Trace</Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {openWhyLegId ? (
        <aside className="mt-3 rounded border border-slate-700 bg-slate-950/70 p-3 text-xs">
          <p className="font-medium">Leg insight drawer</p>
          <ul className="mt-2 space-y-1 text-slate-300">
            {rows
              .find((row) => row.legId === openWhyLegId)
              ?.relatedEvents.slice(0, 4)
              .map((event) => (
                <li key={`${event.event_name}-${event.created_at}`}>{event.event_name.replaceAll('_', ' ')} · {String((event.payload as { agent_id?: string } | null)?.agent_id ?? 'agent:n/a')} · {event.created_at ?? 'n/a'}</li>
              ))}
          </ul>
        </aside>
      ) : null}
    </section>
  );
}
