'use client';

import type { ComponentProps } from 'react';

import { Button } from '@/src/components/ui/button';
import { Chip } from '@/src/components/ui/chip';
import { Surface } from '@/src/components/ui/surface';
import { ShareReply } from '@/src/components/bettor/ShareReply';
import { SlipIntelBar } from '@/src/components/slips/SlipIntelBar';
import {
  EmptyStateBettor,
  LegRankList,
  SlipActionsBar,
  VerdictHero,
  type AnalyzeLeg
} from '@/src/components/bettor/BettorFirstBlocks';
import type { Run } from '@/src/core/run/types';
import type { ResearchRunDTO } from '@/src/core/run/researchRunDTO';

function SnapshotHighlights({ cards }: { cards: Array<{ title: string; bullets: string[]; severity?: 'info' | 'warn' | 'danger'; source?: string }> }) {
  if (cards.length === 0) return null;
  const toneClass = (severity?: 'info' | 'warn' | 'danger') => severity === 'danger' ? 'border-rose-700/70' : severity === 'warn' ? 'border-amber-700/70' : 'border-cyan-700/70';
  return (
    <Surface className="space-y-3">
      <h2 className="text-xl font-semibold">Snapshot highlights</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {cards.slice(0, 2).map((card) => (
          <div key={card.title} className={`rounded-lg border bg-slate-950/40 p-3 ${toneClass(card.severity)}`}>
            <p className="font-medium">{card.title}</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-300">
              {card.bullets.slice(0, 4).map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
            {card.source ? <p className="mt-2 text-xs text-slate-500">Source: {card.source}</p> : null}
          </div>
        ))}
      </div>
    </Surface>
  );
}

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
  onPasteOpen: () => void;
  onRemoveWeakest: () => void;
  onRerun: () => void;
  onTryExample: () => void;
  onCopyReasons: () => void;
  slipHref: string;
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
  onPasteOpen,
  onRemoveWeakest,
  onRerun,
  onTryExample,
  onCopyReasons,
  slipHref
}: AnalyzeTabPanelProps) {
  return (
    <div className="space-y-4">
      <SlipIntelBar legs={intelLegs} />
      {legs.length === 0 ? <EmptyStateBettor onPaste={onPasteOpen} /> : (
        <>
          <VerdictHero confidence={runDto?.verdict.confidence ?? currentRun?.analysis.confidencePct ?? 0} weakestLeg={weakestLeg} reasons={runDto?.verdict.reasons ?? currentRun?.analysis.reasons ?? []} dataQuality="Partial live" />
          <div className="flex flex-wrap gap-2">
            <a href={slipHref} className="rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-100 hover:bg-white/5">Edit in Slip</a>
            <button type="button" className="rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-100 hover:bg-white/5" onClick={onCopyReasons}>
              {copyStatus === 'done' ? 'Copied reasons' : copyStatus === 'error' ? 'Copy unavailable' : 'Copy reasons'}
            </button>
          </div>
          {runDto?.snapshotHighlights?.length ? <SnapshotHighlights cards={runDto.snapshotHighlights} /> : null}
          <SlipActionsBar onRemoveWeakest={onRemoveWeakest} onRerun={onRerun} canTrack />
          <Surface className="space-y-4"><h2 className="text-xl font-semibold">Ranked legs (weakest to strongest)</h2><LegRankList legs={sortedLegs} onRemove={onRemoveWeakest} trustedContext={currentRun?.trustedContext} /></Surface>
        </>
      )}
      <div className="flex flex-wrap gap-2">
        {prefillKeyFromQuery ? <Chip tone="strong">Draft from Scout</Chip> : null}
        <Button intent="primary" onClick={onPasteOpen}>Paste slip</Button>
        <button type="button" className="rounded-lg border border-white/20 px-3 py-2 text-sm" onClick={onTryExample}>Try an example</button>
      </div>
      {currentRun ? <ShareReply run={currentRun} /> : null}
    </div>
  );
}
