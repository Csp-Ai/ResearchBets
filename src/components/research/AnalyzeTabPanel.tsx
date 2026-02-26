'use client';

import type { ComponentProps } from 'react';

import { Button } from '@/src/components/ui/button';
import { Chip } from '@/src/components/ui/chip';
import { Surface } from '@/src/components/ui/surface';
import { SlipIntelBar } from '@/src/components/slips/SlipIntelBar';
import {
  EmptyStateBettor,
  LegRankList,
  type AnalyzeLeg
} from '@/src/components/bettor/BettorFirstBlocks';
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
  slipHref: string;
  boardHref: string;
  uncertainty?: string;
  demoSlip: string;
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
  slipHref,
  boardHref,
  uncertainty,
  demoSlip
}: AnalyzeTabPanelProps) {
  const reasons = (runDto?.verdict.reasons ?? currentRun?.analysis.reasons ?? []).slice(0, 4);
  const weakestReasons = (weakestLeg?.riskFactors ?? []).filter(Boolean);
  const combinedReasons = [...reasons, ...weakestReasons].filter(Boolean).slice(0, 4);
  const hasSlip = legs.length > 0;
  const slipLines = (runDto?.raw_slip_text || currentRun?.slipText || demoSlip)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3">
      <section className="bettor-card space-y-2 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-2xl font-semibold">Stress Test</h2>
            <p className="text-sm text-slate-300">Find the weakest leg before you place.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={slipHref} className="rounded-lg border border-white/20 px-2.5 py-1.5 text-xs text-slate-100 hover:bg-white/5">Back to Slip</a>
            <a href={boardHref} className="rounded-lg border border-white/20 px-2.5 py-1.5 text-xs text-slate-100 hover:bg-white/5">Back to Board</a>
          </div>
        </div>
        <SlipIntelBar legs={intelLegs} />
      </section>

      <Surface kind="hero" className="space-y-3 p-4" data-testid="decision-terminal-verdict">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Weakest leg</p>
          <p className="text-lg font-semibold text-strong">{weakestLeg?.selection ?? 'LeBron James over 6.5 rebounds (-105)'}</p>
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
