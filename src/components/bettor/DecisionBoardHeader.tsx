'use client';

import React from 'react';

import { deriveSlipVerdict, type SlipLeg } from './bettorDerivations';
import type { ControlPlaneEvent } from '../AgentNodeGraph';

export type VerdictPill = 'KEEP' | 'MODIFY' | 'PASS';

export function verdictFromConfidence(confidence: number, riskLevel: 'Low' | 'Medium' | 'High'): VerdictPill {
  if (riskLevel === 'High' && confidence < 0.55) return 'PASS';
  if (confidence >= 0.68 && riskLevel !== 'High') return 'KEEP';
  return 'MODIFY';
}

export function DecisionBoardHeader({ events, legs, traceId, onFixSlip, onRerunResearch }: { events: ControlPlaneEvent[]; legs: SlipLeg[]; traceId?: string; onFixSlip?: () => void; onRerunResearch?: () => void }) {
  const verdict = deriveSlipVerdict(events, legs);
  const pill = verdictFromConfidence(verdict.confidence, verdict.riskLevel);

  return (
    <section className="rounded-xl border border-cyan-500/40 bg-slate-900 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-400">Decision engine {traceId ? `· ${traceId.slice(0, 8)}` : ''}</p>
        <span className="rounded-full border border-cyan-500/60 bg-cyan-500/10 px-3 py-1 text-xs font-semibold">{pill}</span>
      </div>
      <p className="mt-2 text-sm text-slate-200">Weakest leg: <span className="font-semibold">{verdict.weakestLeg ?? 'Pending'}</span></p>
      <p className="text-xs text-slate-400">ConfidenceMeter {verdict.confidence.toFixed(2)} · RiskMeter {verdict.riskLevel}</p>
      <ul className="mt-2 list-disc pl-4 text-xs text-slate-300">
        {(verdict.reasons.length > 0 ? verdict.reasons : ['Waiting for evidence from research events.']).map((reason) => <li key={reason}>{reason}</li>)}
      </ul>
      <div className="mt-2 flex flex-wrap gap-1">
        {(verdict.riskFlags.length > 0 ? verdict.riskFlags : ['Low evidence']).map((flag) => (
          <span key={flag} className="rounded border border-amber-500/40 px-2 py-0.5 text-[11px] text-amber-200">{flag}</span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <button type="button" onClick={onFixSlip} className="rounded bg-rose-600 px-3 py-1.5 font-medium">Fix Slip</button>
        <button type="button" onClick={onRerunResearch} className="rounded bg-cyan-600 px-3 py-1.5 font-medium">Rerun Research</button>
        {traceId ? <a className="rounded border border-slate-600 px-3 py-1.5" href={`/traces/${encodeURIComponent(traceId)}`}>View Trace</a> : null}
      </div>
    </section>
  );
}
