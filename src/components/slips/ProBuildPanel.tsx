'use client';

import { useMemo } from 'react';

import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { CardSurface } from '@/src/components/ui/CardSurface';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/button';
import { enforceProConstraints, proBuildScore } from '@/src/core/slipMath/legHeuristics';
import { americanToDecimal, breakEvenProbFromDecimal, parlayProbIndependent } from '@/src/core/slipMath/parlayMath';
import { listGuardrails } from '@/src/core/guardrails/localGuardrails';

function parseAmerican(odds?: string): number | null {
  if (!odds) return null;
  const parsed = Number(odds);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ProBuildPanel({ legs, onApply }: { legs: SlipBuilderLeg[]; onApply: (nextLegs: SlipBuilderLeg[]) => void }) {
  const constraints = useMemo(() => enforceProConstraints(legs), [legs]);
  const guardrails = useMemo(() => listGuardrails(), []);

  const independentProb = useMemo(() => {
    const probs = legs.map((leg) => Math.max(0.2, Math.min(0.95, leg.confidence ?? 0.55)));
    return parlayProbIndependent(probs);
  }, [legs]);

  const breakEven = useMemo(() => {
    if (legs.length === 0) return 0;
    const decimal = legs.reduce((acc, leg) => {
      const american = parseAmerican(leg.odds);
      if (american === null) return acc;
      return acc * americanToDecimal(american);
    }, 1);
    return breakEvenProbFromDecimal(decimal);
  }, [legs]);

  const applyProSize = (size: number) => {
    const ranked = [...legs]
      .map((leg) => ({ leg, score: proBuildScore(leg) }))
      .sort((a, b) => b.score - a.score);

    const selected: SlipBuilderLeg[] = [];
    let highVarianceUsed = 0;
    for (const item of ranked) {
      const isHighVariance = item.leg.marketType === 'assists' || item.leg.marketType === 'threes' || item.leg.volatility === 'high';
      if (isHighVariance && highVarianceUsed >= 1) continue;
      selected.push(item.leg);
      if (isHighVariance) highVarianceUsed += 1;
      if (selected.length === size) break;
    }
    onApply(selected);
  };

  return (
    <CardSurface className="space-y-3 p-4" data-testid="pro-build-panel">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">Pro Build</h3>
        <Badge size="sm" variant="info">Deterministic</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="row-shell"><p className="text-slate-400">Leg count</p><p className="mono-number text-slate-100">{legs.length}</p></div>
        <div className="row-shell"><p className="text-slate-400">Variance legs</p><p className="mono-number text-slate-100">{constraints.varianceLegs}</p></div>
        <div className="row-shell"><p className="text-slate-400">Weakest dominance</p><p className="mono-number text-slate-100">{constraints.weakestDominancePct}%</p></div>
        <div className="row-shell"><p className="text-slate-400">Correlation</p><p className="text-slate-100">{constraints.excessiveCorrelation ? 'Warning' : 'Normal'}</p></div>
      </div>
      <div className="terminal-divider pt-2 text-xs text-slate-300">
        <p className="mono-number">Independent parlay probability: {(independentProb * 100).toFixed(1)}%</p>
        <p className="mono-number">Break-even probability: {(breakEven * 100).toFixed(1)}%</p>
        <p className="mt-1 text-slate-400">Estimate uses proxies.</p>
      </div>
      <div className="space-y-1">
        {constraints.warnings.map((warning) => <p key={warning} className="text-xs text-amber-200">• {warning}</p>)}
        {guardrails.map((rule) => <p key={rule.key} className="text-xs text-cyan-200">• Guardrail: {rule.title}</p>)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button intent="secondary" className="min-h-0 py-2 text-xs" onClick={() => applyProSize(2)} disabled={legs.length < 2}>Apply 2-leg Pro</Button>
        <Button intent="primary" className="min-h-0 py-2 text-xs" onClick={() => applyProSize(3)} disabled={legs.length < 3}>Apply 3-leg Pro</Button>
      </div>
    </CardSurface>
  );
}
