'use client';

import { useMemo, useState } from 'react';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { Button } from '@/src/components/ui/button';
import { CardSurface } from '@/src/components/ui/CardSurface';
import {
  buildBuildCopilotRead,
  type BuildCopilotIntent,
} from '@/src/core/copilot/buildDecision';

const INTENTS: Array<{ id: BuildCopilotIntent; label: string }> = [
  { id: 'best_move', label: 'Best move' },
  { id: 'make_safer', label: 'Make safer' },
  { id: 'selective_push', label: 'Where can I push?' },
  { id: 'explain_ticket', label: 'Explain ticket' },
];

export function BuildDecisionCopilot({
  legs,
  onAnalyze,
}: {
  legs: SlipBuilderLeg[];
  onAnalyze: () => void;
}) {
  const [intent, setIntent] = useState<BuildCopilotIntent>('best_move');
  const read = useMemo(
    () =>
      buildBuildCopilotRead({
        legs,
        ideas: [],
        intent,
        marketState: 'unavailable',
      }),
    [intent, legs],
  );

  if (legs.length === 0) return null;

  return (
    <CardSurface className="p-4 sm:p-5" data-testid="build-decision-copilot">
      <div className="text-[9px] font-semibold uppercase tracking-[0.17em] text-cyan-100/55">
        ResearchBets Copilot
      </div>
      <h3 className="mt-1 text-[21px] font-semibold tracking-[-0.035em] text-slate-100">
        Ask the ticket one useful question.
      </h3>
      <p className="mt-1 max-w-2xl text-[10px] leading-5 text-slate-500">
        Copilot starts with ticket structure and fails closed on market changes until a fresh ladder is verified.
      </p>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Copilot question">
        {INTENTS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={
              intent === option.id
                ? 'rounded-full border border-cyan-300/40 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-semibold text-cyan-100'
                : 'rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[10px] text-slate-400'
            }
            onClick={() => setIntent(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-white/[0.07] bg-black/20 p-4">
        <div className="text-[15px] font-semibold text-slate-100">{read.headline}</div>
        <p className="mt-2 text-[11px] leading-5 text-slate-300">{read.answer}</p>
        <div className="mt-3 rounded-xl border border-amber-200/[0.08] bg-amber-300/[0.025] p-3">
          <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-amber-100/55">
            Primary pressure
          </div>
          <p className="mt-1 text-[10px] leading-5 text-slate-400">{read.pressure}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {read.evidence.map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/[0.07] px-2 py-1 text-[9px] text-slate-500"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <Button intent="secondary" className="mt-3 min-h-0 px-4 py-2 text-xs" onClick={onAnalyze}>
        X-Ray this ticket
      </Button>
    </CardSurface>
  );
}
