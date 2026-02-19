'use client';

import React, { Suspense, useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { runSlip } from '@/src/core/pipeline/runSlip';
import { runStore } from '@/src/core/run/store';
import type { EnrichedLeg, Run } from '@/src/core/run/types';
import { readDeveloperMode } from '@/src/core/ui/preferences';
import {
  AdvancedDrawer,
  EmptyStateBettor,
  HowItWorksMini,
  LegRankList,
  RecentActivityPanel,
  SlipActionsBar,
  VerdictHero,
  type AnalyzeLeg,
  type RecentRun
} from '@/src/components/bettor/BettorFirstBlocks';
import { Button } from '@/src/components/ui/button';
import { Chip } from '@/src/components/ui/chip';
import { Surface } from '@/src/components/ui/surface';

const DEMO_SLIP = `Jayson Tatum over 29.5 points (-110)\nLuka Doncic over 8.5 assists (-120)\nLeBron James over 6.5 rebounds (-105)`;

function inferRunStatus(updatedAt: string): RecentRun['status'] {
  const updatedMs = new Date(updatedAt).getTime();
  if (Number.isFinite(updatedMs) && Date.now() - updatedMs <= 3 * 60 * 1000) return 'running';
  return 'complete';
}

const toAnalyzeLeg = (run: Run): AnalyzeLeg[] => {
  return run.extractedLegs.map((leg) => {
    const enriched = run.enrichedLegs.find((item) => item.extractedLegId === leg.id);
    const risk: AnalyzeLeg['risk'] = !enriched
      ? 'caution'
      : enriched.l10 >= 65
        ? 'strong'
        : enriched.l10 >= 55
          ? 'caution'
          : 'weak';

    return {
      id: leg.id,
      selection: leg.selection,
      market: leg.market,
      line: leg.line,
      odds: leg.odds,
      l5: enriched?.l5 ?? 0,
      l10: enriched?.l10 ?? 0,
      season: enriched?.season,
      vsOpp: enriched?.vsOpp,
      risk,
      divergence: typeof enriched?.flags.divergence === 'number' && enriched.flags.divergence > 0
    };
  });
};

export function ResearchPageContent() {
  const search = useSearchParams();
  const router = useRouter();
  const [pasteOpen, setPasteOpen] = useState(false);
  const [rawSlip, setRawSlip] = useState('');
  const [status, setStatus] = useState('');
  const [developerMode, setDeveloperMode] = useState(false);
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);

  const traceFromQuery = search.get('trace') ?? search.get('trace_id') ?? '';

  const refreshRecent = async () => {
    const runs = await runStore.listRuns(5);
    setRecentRuns(runs.map((run) => ({ traceId: run.traceId, updatedAt: run.updatedAt, status: inferRunStatus(run.updatedAt) })));
  };

  const loadRun = async (traceId: string) => {
    const run = await runStore.getRun(traceId);
    setCurrentRun(run);
  };

  useEffect(() => {
    setDeveloperMode(readDeveloperMode());
  }, []);

  useEffect(() => {
    void refreshRecent();
  }, []);

  useEffect(() => {
    if (traceFromQuery) {
      void loadRun(traceFromQuery);
      return;
    }

    void (async () => {
      const runs = await runStore.listRuns(1);
      if (runs[0]) setCurrentRun(runs[0]);
    })();
  }, [traceFromQuery]);

  const legs = useMemo(() => (currentRun ? toAnalyzeLeg(currentRun) : []), [currentRun]);
  const sortedLegs = useMemo(() => [...legs].sort((a, b) => a.l5 - b.l5), [legs]);
  const weakestLeg = useMemo(() => {
    if (!currentRun?.analysis.weakestLegId) return sortedLegs[0] ?? null;
    return sortedLegs.find((leg) => leg.id === currentRun.analysis.weakestLegId) ?? sortedLegs[0] ?? null;
  }, [sortedLegs, currentRun]);

  const submitPaste = async () => {
    const traceId = await runSlip(rawSlip);
    setPasteOpen(false);
    await refreshRecent();
    router.push(`/research?trace=${encodeURIComponent(traceId)}`);
  };

  const recomputeFromEnriched = (run: Run, enrichedLegs: EnrichedLeg[]): Run => {
    const ranked = [...enrichedLegs].sort((a, b) => (a.l5 + a.l10) - (b.l5 + b.l10));
    const weakestLegId = ranked[0]?.extractedLegId ?? null;
    const confidence = Math.max(35, Math.min(85, Math.round(ranked.reduce((sum, leg) => sum + leg.l10, 0) / Math.max(1, ranked.length))));
    const riskLabel = confidence >= 70 ? 'Strong' : confidence >= 55 ? 'Caution' : 'Weak';

    return {
      ...run,
      enrichedLegs,
      analysis: {
        ...run.analysis,
        weakestLegId,
        confidencePct: confidence,
        riskLabel,
        reasons: ranked.slice(0, 3).map((leg) => `${run.extractedLegs.find((item) => item.id === leg.extractedLegId)?.selection ?? leg.extractedLegId} is under pressure (${leg.l5}% L5, ${leg.l10}% L10).`),
        computedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    };
  };

  const removeWeakest = async () => {
    if (!currentRun?.analysis.weakestLegId) return;
    const next = recomputeFromEnriched(
      {
        ...currentRun,
        extractedLegs: currentRun.extractedLegs.filter((leg) => leg.id !== currentRun.analysis.weakestLegId)
      },
      currentRun.enrichedLegs.filter((leg) => leg.extractedLegId !== currentRun.analysis.weakestLegId)
    );
    await runStore.updateRun(next.traceId, next);
    setCurrentRun(next);
    await refreshRecent();
  };

  const rerunResearch = async () => {
    if (!currentRun) return;
    const traceId = await runSlip(currentRun.slipText);
    await refreshRecent();
    router.push(`/research?trace=${encodeURIComponent(traceId)}`);
  };

  const tryExample = () => {
    router.push(`/ingest?prefill=${encodeURIComponent(DEMO_SLIP)}`);
  };

  return (
    <section className="space-y-8">
      <Surface kind="hero" className="ui-surface-card" data-testid="research-primary-hero">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold leading-tight">Analyze a bet</h1>
            <p className="text-sm text-muted">Get confidence, risk flags, and the exact leg that can break your slip.</p>
            <button type="button" className="text-sm text-link underline underline-offset-4" onClick={tryExample}>Try an example</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button intent="primary" onClick={() => setPasteOpen(true)}>Paste slip</Button>
            <Link href="/discover" className="ui-button ui-button-secondary">Build slip</Link>
          </div>
        </div>
      </Surface>

      <section className="space-y-8">
        {legs.length === 0 ? <EmptyStateBettor onPaste={() => setPasteOpen(true)} /> : (
          <>
            <VerdictHero confidence={currentRun?.analysis.confidencePct ?? 0} weakestLeg={weakestLeg} reasons={currentRun?.analysis.reasons ?? []} />
            <SlipActionsBar onRemoveWeakest={() => void removeWeakest()} onRerun={() => void rerunResearch()} canTrack />
            <Surface className="space-y-4">
              <h2 className="text-xl font-semibold">Ranked legs (weakest to strongest)</h2>
              <LegRankList legs={sortedLegs} onRemove={() => void removeWeakest()} />
            </Surface>
          </>
        )}

        <RecentActivityPanel runs={recentRuns} onOpen={(recentTraceId) => router.push(`/research?trace=${encodeURIComponent(recentTraceId)}`)} />
        <HowItWorksMini />
      </section>

      <AdvancedDrawer developerMode={developerMode}>
        <div className="flex flex-wrap gap-2">
          <Chip>Trace ID: {currentRun?.traceId ?? 'n/a'}</Chip>
          <Chip tone={currentRun?.sources.stats === 'live' ? 'strong' : 'caution'}>Stats: {currentRun?.sources.stats ?? 'fallback'}</Chip>
          <Chip tone={currentRun?.sources.injuries === 'live' ? 'strong' : 'caution'}>Injuries: {currentRun?.sources.injuries ?? 'fallback'}</Chip>
          <Chip tone={currentRun?.sources.odds === 'live' ? 'strong' : 'caution'}>Odds: {currentRun?.sources.odds ?? 'fallback'}</Chip>
        </div>
        <pre className="overflow-auto rounded bg-slate-950/80 p-2">{JSON.stringify({ legs, status, analysis: currentRun?.analysis }, null, 2)}</pre>
      </AdvancedDrawer>

      {pasteOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <Surface className="w-full max-w-2xl">
            <h2 className="text-lg font-semibold">Paste slip</h2>
            <textarea className="mt-3 h-56 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm" value={rawSlip} onChange={(event) => setRawSlip(event.target.value)} placeholder="Paste each leg on a new line" />
            <div className="mt-3 flex gap-2">
              <Button intent="primary" onClick={() => void submitPaste()}>Analyze now</Button>
              <Button intent="secondary" onClick={() => setPasteOpen(false)}>Cancel</Button>
            </div>
          </Surface>
        </div>
      ) : null}
    </section>
  );
}

export default function ResearchPage() {
  return <Suspense fallback={null}><ResearchPageContent /></Suspense>;
}
