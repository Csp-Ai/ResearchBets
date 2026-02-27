'use client';

import { useEffect, useState, type ComponentProps } from 'react';

import { Button } from '@/src/components/ui/button';
import { Chip } from '@/src/components/ui/chip';
import { Surface } from '@/src/components/ui/surface';
import { SlipIntelBar } from '@/src/components/slips/SlipIntelBar';
import { deriveSlipRiskSummary } from '@/src/core/slips/slipRiskSummary';
import { presentRecommendation } from '@/src/core/slips/recommendationPresentation';
import { rankReasons, selectTopReasons } from '@/src/core/slips/reasonRanker';
import {
  EmptyStateBettor,
  LegRankList,
  type AnalyzeLeg
} from '@/src/components/bettor/BettorFirstBlocks';
import { SystemCalibrationStrip } from '@/src/components/research/SystemCalibrationStrip';
import type { Run } from '@/src/core/run/types';
import type { ResearchRunDTO } from '@/src/core/run/researchRunDTO';

type IntelLegs = ComponentProps<typeof SlipIntelBar>['legs'];

type AnalyzeTabPanelProps = {
  intelLegs: IntelLegs;
  legs: AnalyzeLeg[];
  sortedLegs: AnalyzeLeg[];
  weakestLeg: AnalyzeLeg | null;
  runDto: ResearchRunDTO | null;
  currentRun: Run | null;
  prefillKeyFromQuery: string;
  copyStatus: 'idle' | 'done' | 'error';
  copySlipStatus: 'idle' | 'done' | 'error';
  onPasteOpen: () => void;
  onTryExample: () => void;
  onCopyReasons: () => void;
  onCopySlip: () => void;
  onShareRun: () => void;
  slipHref: string;
  shareStatus: 'idle' | 'done' | 'error';
  uncertainty?: string;
  demoSlip: string;
  latestRunHref?: string | null;
};

export default function AnalyzeTabPanel({
  intelLegs,
  legs,
  sortedLegs,
  weakestLeg,
  runDto,
  currentRun,
  prefillKeyFromQuery,
  copyStatus,
  copySlipStatus,
  onPasteOpen,
  onTryExample,
  onCopyReasons,
  onCopySlip,
  onShareRun,
  slipHref,
  shareStatus,
  uncertainty,
  demoSlip,
  latestRunHref
}: AnalyzeTabPanelProps) {
  const [calibration, setCalibration] = useState({
    take_accuracy: 0,
    weakest_leg_accuracy: 0,
    runs_analyzed: 0,
    last_updated: null as string | null
  });

  useEffect(() => {
    let active = true;
    fetch('/api/metrics/calibration', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active || !payload?.data) return;
        setCalibration({
          take_accuracy: Number(payload.data.take_accuracy ?? 0),
          weakest_leg_accuracy: Number(payload.data.weakest_leg_accuracy ?? 0),
          runs_analyzed: Number(payload.data.runs_analyzed ?? 0),
          last_updated: (payload.data.last_updated as string | null) ?? null
        });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const reasons = runDto?.verdict.reasons ?? currentRun?.analysis.reasons ?? [];
  const weakestReasons = (weakestLeg?.riskFactors ?? []).filter(Boolean);
  const riskSummary = deriveSlipRiskSummary(intelLegs);
  const rankedReasons = rankReasons([...riskSummary.reasonBullets, ...reasons, ...weakestReasons], {
    dominant: riskSummary.dominantRiskFactor,
    correlation: riskSummary.correlationFlag,
    volatility: riskSummary.volatilitySummary
  });
  const combinedReasons = selectTopReasons(rankedReasons, 3);
  const hasSlip = legs.length > 0;
  const slipLines = (runDto?.raw_slip_text || currentRun?.slipText || demoSlip)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3">
      <SystemCalibrationStrip
        takeAccuracy={calibration.take_accuracy}
        weakestLegAccuracy={calibration.weakest_leg_accuracy}
        runsAnalyzed={calibration.runs_analyzed}
        lastUpdated={calibration.last_updated}
      />

      <section className="bettor-card space-y-2 p-4">
        <SlipIntelBar legs={intelLegs} />
      </section>

      <Surface kind="hero" className="space-y-3 p-4" data-testid="decision-terminal-verdict">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Slip verdict</p>
          <p className="text-2xl font-bold text-strong">{presentRecommendation(riskSummary.recommendation)}</p>
          <p className="text-sm text-subtle">Confidence {riskSummary.confidencePct}% · Risk {riskSummary.riskLabel}</p>
          <p className="text-sm font-semibold text-amber-200">Weakest leg: {riskSummary.weakestLeg}</p>
          <p className="text-xs text-rose-200">Dominant risk factor: {riskSummary.dominantRiskFactor}</p>
        </div>
        <ul className="space-y-1 text-sm text-subtle">
          {combinedReasons.length > 0 ? combinedReasons.map((reason) => <li key={reason}>• {reason}</li>) : <li>• Review line movement and recent hit rate before placement.</li>}
        </ul>
        {uncertainty ? <p className="text-xs text-muted">Uncertainty: {uncertainty}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button intent="primary" onClick={onCopySlip}>{copySlipStatus === 'done' ? 'Copied slip' : copySlipStatus === 'error' ? 'Copy unavailable' : 'Copy slip'}</Button>
          <a href={slipHref} className="rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-100 hover:bg-white/5">Edit in Slip</a>
          <button type="button" className="rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-100 hover:bg-white/5" onClick={onCopyReasons}>
            {copyStatus === 'done' ? 'Copied reasons' : copyStatus === 'error' ? 'Copy unavailable' : 'Copy reasons'}
          </button>
          <button type="button" className="rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-100 hover:bg-white/5" onClick={onShareRun}>
            {shareStatus === 'done' ? 'Shared run' : shareStatus === 'error' ? 'Share unavailable' : 'Share'}
          </button>
        </div>
      </Surface>

      <Surface className="space-y-3 p-4">
        {hasSlip ? (
          <>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Slip to place</h3>
            <ol className="space-y-1 text-sm text-strong">
              {slipLines.map((line, index) => <li key={`${index + 1}-${line}`}>{index + 1}. {line}</li>)}
            </ol>
          </>
        ) : (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Paste slip</h3>
            <pre className="ui-shell-panel p-3 text-xs text-subtle whitespace-pre-wrap">{demoSlip}</pre>
            <div className="flex items-center gap-3">
              <Button intent="primary" onClick={onPasteOpen}>Paste slip</Button>
              <button type="button" className="text-xs text-link underline" onClick={onTryExample}>Try an example</button>
              {latestRunHref ? <a href={latestRunHref} className="text-xs text-link underline">Open latest run</a> : null}
            </div>
          </div>
        )}
        {prefillKeyFromQuery ? <Chip tone="strong">Draft from Scout</Chip> : null}
      </Surface>

      <details className="ui-shell-drawer px-3 py-2" data-testid="run-details-collapsed">
        <summary className="cursor-pointer text-xs font-semibold tracking-wide text-muted">Run details</summary>
        {hasSlip ? <div className="mt-2"><LegRankList legs={sortedLegs} onRemove={() => undefined} trustedContext={currentRun?.trustedContext} /></div> : <EmptyStateBettor onPaste={onPasteOpen} />}
      </details>
    </div>
  );
}
