'use client';

import React from 'react';
import type { ControlPlaneEvent } from '../AgentNodeGraph';

import { deriveSlipVerdict, type SlipLeg } from './bettorDerivations';

type SlipVerdictCardProps = {
  traceId?: string;
  legs?: SlipLeg[];
  events: ControlPlaneEvent[];
  onRemoveWeakestLeg?: () => void;
  onRerunResearch?: () => void;
  onTrackBet?: () => void;
  canTrackBet?: boolean;
};

export function SlipVerdictCard({
  traceId,
  legs = [],
  events,
  onRemoveWeakestLeg,
  onRerunResearch,
  onTrackBet,
  canTrackBet = false
}: SlipVerdictCardProps) {
  const verdict = deriveSlipVerdict(events, legs);

  if (!verdict.hasSignals) {
    return (
      <section className="rounded-xl border border-cyan-500/40 bg-slate-900 p-6">
        <p className="text-xs uppercase tracking-wide text-cyan-300">Bettor Mode</p>
        <h2 className="mt-2 text-3xl font-semibold">Run research to generate a verdict</h2>
        <p className="mt-2 text-sm text-slate-300">
          Paste a slip, run research, and we will rank your strongest and weakest legs in one view.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-cyan-500/40 bg-slate-900 p-6">
      <p className="text-xs uppercase tracking-wide text-cyan-300">Bettor Mode verdict {traceId ? `· ${traceId.slice(0, 8)}` : ''}</p>
      <div className="mt-2 grid gap-4 md:grid-cols-3">
        <div>
          <p className="text-sm text-slate-400">Overall rating</p>
          <p className="text-4xl font-bold text-white">{verdict.rating}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Confidence</p>
          <p className="text-2xl font-semibold text-cyan-200">{Math.round(verdict.confidence * 100)}% · {verdict.confidenceLabel}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Risk level</p>
          <p className="text-2xl font-semibold text-amber-200">{verdict.riskLevel}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded border border-slate-700 bg-slate-950/60 p-3 text-sm">
          <p className="text-slate-400">Strongest leg</p>
          <p>{verdict.strongestLeg ?? 'Run research to rank legs'}</p>
        </div>
        <div className="rounded border border-slate-700 bg-slate-950/60 p-3 text-sm">
          <p className="text-slate-400">Weakest leg</p>
          <p>{verdict.weakestLeg ?? 'Run research to rank legs'}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium">Top reasons</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-slate-300">
            {(verdict.reasons.length > 0 ? verdict.reasons : ['Evidence building: limited signals detected.']).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium">Risk flags</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {(verdict.riskFlags.length > 0 ? verdict.riskFlags : ['Evidence building: limited signals detected']).map((flag) => (
              <span key={flag} className="rounded border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200">{flag}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={onRemoveWeakestLeg} className="rounded bg-rose-600 px-3 py-2 text-xs font-medium">Remove Weakest Leg</button>
        <button type="button" onClick={onRerunResearch} className="rounded bg-cyan-600 px-3 py-2 text-xs font-medium">Rerun Research</button>
        <button type="button" onClick={onTrackBet} disabled={!canTrackBet} title={canTrackBet ? 'Track this bet' : 'Tracking path unavailable'} className="rounded border border-slate-600 px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50">Track Bet</button>
      </div>
    </section>
  );
}
