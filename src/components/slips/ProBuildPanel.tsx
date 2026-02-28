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
  const activeGuardrail = guardrails[0];

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

  const probabilityGap = useMemo(() => independentProb - breakEven, [independentProb, breakEven]);

  const applyProSize = (size: number) => {
    const ranked = [...legs]
      .map((leg) => ({ leg, score: proBuildScore(leg) }))
      .sort((a, b) => b.score - a.score);

    const selected: SlipBuilderLeg[] = [];
    let highVarianceUsed = 0;
    let assistLegsUsed = 0;
    let ladderLegUsed = false;

    const isHighVarianceLeg = (leg: SlipBuilderLeg) => leg.marketType === 'assists' || leg.marketType === 'threes' || leg.volatility === 'high';
    const isThinLadderLeg = (leg: SlipBuilderLeg) => {
      const line = Number(leg.line);
      if (!Number.isFinite(line)) return false;
      if (leg.marketType === 'points') return line >= 30;
      if (leg.marketType === 'threes') return line >= 4.5;
      if (leg.marketType === 'assists') return line >= 6;
      return false;
    };

    for (const item of ranked) {
      const isHighVariance = isHighVarianceLeg(item.leg);
      const isAssist = item.leg.marketType === 'assists';
      const isThinLadder = isThinLadderLeg(item.leg);
      if (isHighVariance && highVarianceUsed >= 1) continue;
      if (isAssist && assistLegsUsed >= 1) continue;
      if (isThinLadder && ladderLegUsed) continue;

      const saferAlternativeExists = ranked.some((candidate) => {
        if (selected.some((picked) => picked.id === candidate.leg.id)) return false;
        return !isThinLadderLeg(candidate.leg);
      });
      if (isThinLadder && saferAlternativeExists && selected.length + 1 < size) continue;

      selected.push(item.leg);
      if (isHighVariance) highVarianceUsed += 1;
      if (isAssist) assistLegsUsed += 1;
      if (isThinLadder) ladderLegUsed = true;
      if (selected.length === size) break;
    }
    onApply(selected);
  };

  const previewSelection = (size: number) => {
    return [...legs]
      .map((leg) => ({ leg, score: proBuildScore(leg) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, size)
      .map((item) => item.leg.player)
      .join(', ');
  };

  const gapTone = probabilityGap >= 0 ? 'text-emerald-200' : 'text-rose-200';

  return (
    <CardSurface className="space-y-3 p-4" data-testid="pro-build-panel">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">Pro Build</h3>
        <Badge size="sm" variant="info">Deterministic</Badge>
      </div>
      {activeGuardrail ? (
        <div className="w-fit rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2 py-1 text-[11px] text-cyan-100">
          Active guardrail: {activeGuardrail.title}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="row-shell"><p className="text-slate-400">Leg count</p><p className="mono-number text-slate-100">{legs.length}</p></div>
        <div className="row-shell"><p className="text-slate-400">Variance legs</p><p className="mono-number text-slate-100">{constraints.varianceLegs}</p></div>
        <div className="row-shell"><p className="text-slate-400">Weakest dominance</p><p className="mono-number text-slate-100">{constraints.weakestDominancePct}%</p></div>
        <div className="row-shell"><p className="text-slate-400">Correlation</p><p className="text-slate-100">{constraints.excessiveCorrelation ? 'Guardrail active' : 'In range'}</p></div>
      </div>
      <div className="terminal-divider rounded-lg bg-slate-950/50 p-3 text-xs text-slate-300">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">Pro cockpit line</p>
        <p className="mono-number mt-1 text-sm">Hit est: {(independentProb * 100).toFixed(1)}% <span className="text-slate-500">|</span> Break-even: {(breakEven * 100).toFixed(1)}% <span className="text-slate-500">|</span> <span className={gapTone}>Gap: {(probabilityGap * 100).toFixed(1)}%</span></p>
        <p className="mt-1 text-slate-400">Estimate uses deterministic proxies.</p>
      </div>
      <div className="space-y-1">
        {constraints.warnings.map((warning) => <p key={warning} className="text-xs text-amber-200">• {warning}</p>)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button intent="secondary" title={legs.length < 2 ? 'Need at least 2 legs' : `Preview keeps: ${previewSelection(2) || 'n/a'}`} className="min-h-0 py-2 text-xs" onClick={() => applyProSize(2)} disabled={legs.length < 2}>Apply 2-leg Pro</Button>
        <Button intent="primary" title={legs.length < 3 ? 'Need at least 3 legs' : `Preview keeps: ${previewSelection(3) || 'n/a'}`} className="min-h-0 py-2 text-xs" onClick={() => applyProSize(3)} disabled={legs.length < 3}>Apply 3-leg Pro</Button>
      </div>
    </CardSurface>
  );
}
