'use client';

import { useMemo, useState } from 'react';

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
  const [open, setOpen] = useState(false);
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
      className={`rounded-[20px] border border-white/8 bg-white/[0.025] p-4 ${className}`}
      data-testid="slip-risk-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="m-0 text-[11px] uppercase tracking-[0.14em] text-slate-400">
            Ticket thesis
          </p>
          <p className="m-0 text-sm font-semibold text-slate-100">
            {presentRecommendation(risk.recommendation)} signal · {risk.lifecycleRisk.pressureLabel}
          </p>
          <p className="m-0 text-sm text-slate-100">{thesis.headline}</p>
          <p className="m-0 text-xs text-slate-300">{thesis.subheadline}</p>
          <p className="m-0 text-xs text-cyan-200">Next step · {thesis.recommended_next_step}</p>
          <div className="pt-1 text-xs text-slate-300">
            <span className="text-slate-400">Why now · </span>
            <span>{thesis.why_now}</span>
          </div>
          {thesis.continuity_read ? (
            <p className="m-0 text-[11px] text-cyan-200/90">{thesis.continuity_read}</p>
          ) : null}
          {thesis.reliability_note ? (
            <p className="m-0 text-[11px] text-cyan-200/90">{thesis.reliability_note}</p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1 text-[10px] text-slate-300">
            <span className="rounded-full border border-white/10 px-2 py-1">
              {titleCase(risk.lifecycleRisk.primaryDriver)}
            </span>
            {risk.lifecycleRisk.secondaryDriver ? (
              <span className="rounded-full border border-white/10 px-2 py-1 text-slate-400">
                {titleCase(risk.lifecycleRisk.secondaryDriver)}
              </span>
            ) : null}
            <span className="rounded-full border border-white/10 px-2 py-1 text-slate-400">
              Reliability {titleCase(risk.lifecycleRisk.reliability)}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="rounded-full border border-white/12 px-3 py-1.5 text-xs text-slate-200 transition hover:border-cyan-400"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Hide detail' : 'Show detail'}
        </button>
      </div>

      {open ? (
        <div className="mt-3 grid gap-3 text-xs text-slate-300">
          <p className="m-0">{thesis.current_thesis}</p>
          <p className="m-0 text-slate-400">{thesis.primary_pressure}</p>
          <div className="rounded-lg border border-cyan-400/15 bg-cyan-400/5 p-2">
            <p className="m-0 text-[11px] uppercase tracking-[0.16em] text-cyan-200/80">
              Next step
            </p>
            <p className="m-0 mt-1 text-sm text-cyan-100">{thesis.recommended_next_step}</p>
            <p className="m-0 mt-1 text-xs text-slate-300">{guidance.action_rationale}</p>
            <p className="m-0 mt-1 text-[11px] text-cyan-200/90">{thesis.why_now}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
            <p className="m-0 text-[11px] uppercase tracking-[0.16em] text-slate-400">Why</p>
            <p className="m-0 mt-1 text-sm text-slate-100">{thesis.current_thesis}</p>
            <p className="m-0 mt-1 text-xs text-slate-400">{thesis.subheadline}</p>
            <p className="m-0 mt-1 text-[11px] text-slate-400">{thesis.continuity_read ?? evidence.stage_note}</p>
          </div>
          <p className="m-0">
            Weakest leg {risk.weakestLeg} · Fragility {risk.fragilityScore}/100 · Correlation{' '}
            {risk.correlationFlag ? 'elevated' : 'managed'}
          </p>
          <div className="flex flex-wrap gap-2">
            {thesis.driver_tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[10px] text-cyan-100"
              >
                {tag}
              </span>
            ))}
          </div>
          <ul className="m-0 list-disc space-y-1 pl-5">
            {risk.reasonBullets.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
