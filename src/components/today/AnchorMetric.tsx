'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import type { SlipStructureReport } from '@/src/core/contracts/slipStructureReport';

type AnchorMetricProps = {
  report?: SlipStructureReport;
};

const riskBandToValue: Record<'low' | 'med' | 'high', number> = {
  low: 24,
  med: 58,
  high: 82
};

const confidenceBoost: Record<'low' | 'med' | 'high', number> = {
  low: -6,
  med: 0,
  high: 8
};

function deriveFragility(report?: SlipStructureReport): number | null {
  if (!report || report.legs.length === 0) return null;
  const risk = report.risk_band ? riskBandToValue[report.risk_band] : 52;
  const confidence = report.confidence_band ? confidenceBoost[report.confidence_band] : 0;
  const overlap = Math.min(15, report.correlation_edges.length * 4);
  const failure = Math.min(12, report.failure_forecast.top_reasons.length * 3);
  return Math.max(1, Math.min(99, Math.round(risk + confidence + overlap + failure)));
}

export function AnchorMetric({ report }: AnchorMetricProps) {
  const fragility = useMemo(() => deriveFragility(report), [report]);
  const [displayValue, setDisplayValue] = useState(0);
  const previousTarget = useRef(0);

  useEffect(() => {
    if (fragility == null) {
      setDisplayValue(0);
      previousTarget.current = 0;
      return;
    }

    let frame = 0;
    const start = previousTarget.current;
    const delta = fragility - start;
    const steps = 16;

    const tick = () => {
      frame += 1;
      const next = start + (delta * frame) / steps;
      setDisplayValue(Math.round(next));
      if (frame < steps) window.setTimeout(tick, 24);
    };

    previousTarget.current = fragility;
    tick();
  }, [fragility]);

  const weakestLeg = report?.legs.find((leg) => leg.leg_id === report.weakest_leg_id);

  return (
    <section aria-label="anchor-metric" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Structural Fragility</p>
      {fragility == null ? (
        <>
          <p className="mt-2 text-4xl font-semibold text-slate-200">—</p>
          <p className="mt-2 text-sm text-slate-400">Add 2–4 legs to see fragility.</p>
        </>
      ) : (
        <>
          <p className="mt-2 text-5xl font-semibold leading-none text-slate-100">{displayValue}%</p>
          <p className="mt-2 text-xs text-slate-400">Weakest leg: {weakestLeg?.player ?? weakestLeg?.market ?? 'Pending leg scoring'}</p>
          <p className="text-xs text-slate-400">Overlap edges: {report?.correlation_edges.length ?? 0}</p>
        </>
      )}
    </section>
  );
}
