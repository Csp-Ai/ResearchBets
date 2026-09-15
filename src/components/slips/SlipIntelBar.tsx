'use client';

import { useMemo } from 'react';

import type { SlipIntelLeg } from '@/src/core/slips/slipIntelligence';
import { deriveSlipRiskSummary } from '@/src/core/slips/slipRiskSummary';
import { deriveLifecycleActionGuidance } from '@/src/core/slips/lifecycleActionGuidance';
import { deriveLifecycleEvidence } from '@/src/core/slips/lifecycleEvidence';
import { deriveTicketThesis } from '@/src/core/slips/ticketThesis';
import { presentRecommendation } from '@/src/core/slips/recommendationPresentation';

const titleCase = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export function SlipIntelBar({
  legs,
  className = ''
}: {
  legs: SlipIntelLeg[];
  className?: string;
}) {
  const risk = useMemo(() => deriveSlipRiskSummary(legs), [legs]);
  const guidance = useMemo(
    () => deriveLifecycleActionGuidance({ risk: risk.lifecycleRisk, stage: 'before' }),
    [risk]
  );
  const evidence = useMemo(
    () =>
      deriveLifecycleEvidence({
        risk: risk.lifecycleRisk,
        guidance,
        stage: 'before'
      }),
    [guidance, risk]
  );
  const thesis = useMemo(
    () =>
      deriveTicketThesis({
        stage: 'before',
        risk: risk.lifecycleRisk,
        guidance,
        evidence
      }),
    [evidence, guidance, risk]
  );

  if (legs.length < 2) return null;

  return (
    <section
      className={`border-y border-white/10 py-6 ${className}`}
      data-testid="slip-risk-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200/80">
          ResearchBets read · Ticket thesis
        </p>
        <p className="m-0 text-xs text-slate-400">
          {presentRecommendation(risk.recommendation)} signal · {risk.lifecycleRisk.pressureLabel}
        </p>
      </div>

      <h2 className="mt-3 max-w-3xl text-2xl font-semibold leading-tight tracking-[-0.02em] text-slate-50 sm:text-3xl">
        {thesis.headline}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{thesis.subheadline}</p>

      <div className="mt-5 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-3">
        <div className="bg-slate-950/90 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Weakest leg</p>
          <p className="mt-1 text-sm font-medium text-slate-100">{risk.weakestLeg}</p>
        </div>
        <div className="bg-slate-950/90 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Fragility</p>
          <p className="mt-1 font-mono text-sm font-semibold text-slate-100">{risk.fragilityScore}/100</p>
        </div>
        <div className="bg-slate-950/90 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Correlation</p>
          <p className="mt-1 text-sm font-medium text-slate-100">
            {risk.correlationFlag ? 'Elevated' : 'Managed'}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm text-cyan-100">
        <span className="text-cyan-200/70">Next step · </span>{thesis.recommended_next_step}
      </p>
      <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">{thesis.why_now}</p>

      <details className="mt-4 border-t border-white/8 pt-4 text-sm text-slate-300">
        <summary className="cursor-pointer select-none text-xs font-medium text-slate-300 hover:text-white">
          Why ResearchBets sees it this way
        </summary>
        <div className="mt-4 max-w-3xl space-y-3">
          <p className="m-0 leading-6 text-slate-200">{thesis.current_thesis}</p>
          <p className="m-0 text-sm leading-6 text-slate-400">{thesis.primary_pressure}</p>
          {thesis.continuity_read ? (
            <p className="m-0 text-xs leading-5 text-cyan-200/80">{thesis.continuity_read}</p>
          ) : null}
          {thesis.reliability_note ? (
            <p className="m-0 text-xs leading-5 text-slate-500">{thesis.reliability_note}</p>
          ) : null}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>Primary driver · {titleCase(risk.lifecycleRisk.primaryDriver)}</span>
            {risk.lifecycleRisk.secondaryDriver ? (
              <span>Secondary · {titleCase(risk.lifecycleRisk.secondaryDriver)}</span>
            ) : null}
            <span>Reliability · {titleCase(risk.lifecycleRisk.reliability)}</span>
          </div>
          <ul className="m-0 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-400">
            {risk.reasonBullets.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </div>
      </details>
    </section>
  );
}
