'use client';

import { useEffect, useState, type ComponentProps } from 'react';

import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/Badge';
import { CardSurface } from '@/src/components/ui/CardSurface';
import { SlipIntelBar } from '@/src/components/slips/SlipIntelBar';
import { deriveSlipRiskSummary } from '@/src/core/slips/slipRiskSummary';
import { presentRecommendation } from '@/src/core/slips/recommendationPresentation';
import { rankReasons, selectTopReasons } from '@/src/core/slips/reasonRanker';
import { LegRankList, type AnalyzeLeg } from '@/src/components/bettor/BettorFirstBlocks';
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
  boardHref: string;
  shareStatus: 'idle' | 'done' | 'error';
  uncertainty?: string;
  demoSlip: string;
  latestRunHref?: string | null;
};

export default function AnalyzeTabPanel({
  intelLegs, legs, sortedLegs, weakestLeg, runDto, currentRun, prefillKeyFromQuery, copyStatus, copySlipStatus,
  onPasteOpen, onTryExample, onCopyReasons, onCopySlip, onShareRun, slipHref, boardHref, shareStatus, uncertainty, demoSlip, latestRunHref
}: AnalyzeTabPanelProps) {
  const [calibration, setCalibration] = useState({ take_accuracy: 0, weakest_leg_accuracy: 0, runs_analyzed: 0, last_updated: null as string | null });
  const [pulse, setPulse] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!runDto?.trace_id && !currentRun?.trace_id) return;
    setPulse(true);
    const timer = window.setTimeout(() => setPulse(false), 1200);
    return () => window.clearTimeout(timer);
  }, [runDto?.trace_id, currentRun?.trace_id]);

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
  const slipLines = (runDto?.raw_slip_text || currentRun?.slipText || demoSlip).split('\n').map((line) => line.trim()).filter(Boolean);

  return (
    <div className="space-y-3">
      <SystemCalibrationStrip
        takeAccuracy={calibration.take_accuracy}
        weakestLegAccuracy={calibration.weakest_leg_accuracy}
        runsAnalyzed={calibration.runs_analyzed}
        lastUpdated={calibration.last_updated}
      />

      {hasSlip ? (
        <CardSurface className="space-y-4 p-4 transition-opacity duration-300" data-testid="decision-terminal-verdict">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto]">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Verdict bar</p>
              <div className={`flex items-center gap-2 rounded-md px-1 py-0.5 ${pulse ? 'signal-pulse' : ''}`}>
                <Badge variant={presentRecommendation(riskSummary.recommendation).toUpperCase().includes('TAKE') ? 'success' : 'warning'}>{presentRecommendation(riskSummary.recommendation)}</Badge>
                <p className="text-sm text-slate-300">{combinedReasons[0] ?? 'Check line movement before locking.'}</p>
              </div>
            </div>
            <div className={pulse ? 'signal-pulse rounded-md px-1 py-0.5' : ''}>
              <p className="text-xs text-slate-500">Confidence</p>
              <div className="mt-1 h-1.5 rounded bg-slate-900"><div className="h-1.5 rounded bg-gradient-to-r from-amber-400 to-[#00E5C8] transition-all duration-1000" style={{ width: `${riskSummary.confidencePct}%` }} /></div>
              <p className="mono-number mt-1 text-sm text-slate-200">{riskSummary.confidencePct}%</p>
            </div>
            <div className={`flex items-end gap-2 rounded-md px-1 py-0.5 ${pulse ? 'signal-pulse' : ''}`}>
              <Badge variant="warning">Fragility {riskSummary.fragilityScore}</Badge>
              <Badge variant={riskSummary.correlationFlag ? 'warning' : 'success'}>{riskSummary.correlationFlag ? 'Guardrail active' : 'Correlation managed'}</Badge>
            </div>
          </div>

          <CardSurface className="p-4">
            <p className="text-xs font-semibold text-amber-100">Weakest leg</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">{riskSummary.weakestLeg}</p>
            <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">Why it&rsquo;s fragile</p>
            <div className="mt-2 space-y-1 text-sm text-slate-300">
              {combinedReasons.length > 0 ? combinedReasons.slice(0, 3).map((reason) => <p key={reason}>• {reason}</p>) : <p>• Check line movement before locking.</p>}
            </div>
            <a href={slipHref} className="terminal-focus mt-3 inline-flex rounded-md border border-cyan-300/45 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/10">Edit slip</a>
          </CardSurface>

          <div className="flex flex-wrap gap-2">
            <Button intent="primary" onClick={onCopySlip}>{copySlipStatus === 'done' ? 'Copied slip' : copySlipStatus === 'error' ? 'Copy unavailable' : 'Copy slip'}</Button>
            <button type="button" className="rounded-lg px-3 py-2 text-sm text-slate-100" onClick={onCopyReasons}>{copyStatus === 'done' ? 'Copied reasons' : copyStatus === 'error' ? 'Copy unavailable' : 'Copy reasons'}</button>
            <button type="button" className="rounded-lg px-3 py-2 text-sm text-slate-100" onClick={onShareRun}>{shareStatus === 'done' ? 'Shared run' : shareStatus === 'error' ? 'Share unavailable' : 'Share'}</button>
          </div>
        </CardSurface>
      ) : (
        <CardSurface className="space-y-3 p-4" data-testid="empty-slip-verdict-state">
          <p className="text-lg font-semibold text-slate-100">Add a slip to get a verdict.</p>
          <div className="flex flex-wrap gap-2">
            <Button intent="primary" onClick={onPasteOpen}>Paste slip</Button>
            <Button intent="secondary" onClick={onTryExample}>Try sample slip (demo)</Button>
            <a href={boardHref} className="rounded-lg bg-[#00E5C8] px-3 py-2 text-sm font-semibold text-slate-950">Build from Board</a>
          </div>
        </CardSurface>
      )}

      <CardSurface className="space-y-3 p-4">
        <h3 className="text-sm font-semibold text-slate-400">Slip to place</h3>
        <ol className="space-y-1 text-sm text-slate-100">{slipLines.map((line, index) => <li key={`${index + 1}-${line}`}>{index + 1}. {line}</li>)}</ol>
        {prefillKeyFromQuery ? <Badge variant="info">Draft from Scout</Badge> : null}
      </CardSurface>

      <section className="rounded-lg border border-white/10 bg-black/20 px-3 py-2" data-testid="run-details-collapsed">
        <button type="button" className={`disclosure-button ${showDetails ? 'disclosure-open' : ''}`} onClick={() => setShowDetails((value) => !value)}>
          <span className="text-xs font-semibold tracking-wide text-slate-300">Details</span>
          <span className="disclosure-caret">⌄</span>
        </button>
        <div className={`collapse-shell ${showDetails ? 'collapse-shell-open mt-2' : ''}`}>
          {hasSlip ? <div className="mt-2"><LegRankList legs={sortedLegs} onRemove={() => undefined} trustedContext={currentRun?.trustedContext} /></div> : <p className="mt-2 text-xs text-slate-400">Run a sample slip to see weakest-leg and correlation risk.</p>}
          {uncertainty ? <p className="mt-2 text-xs text-slate-400">Uncertainty: {uncertainty}</p> : null}
          {latestRunHref ? <a href={latestRunHref} className="mt-1 block text-xs text-cyan-200 underline">Open latest run details</a> : null}
        </div>
      </section>

      <div className="hidden"><SlipIntelBar legs={intelLegs} /></div>
    </div>
  );
}
