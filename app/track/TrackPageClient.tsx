'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { buildJournalEntry } from '@/src/core/journal/buildJournalEntry';
import { saveJournalEntry } from '@/src/core/journal/storage';
import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { TrackSlipInput } from '@/src/components/track/TrackSlipInput';
import { buildSlateSummary } from '@/src/core/slate/slateEngine';
import { detectReactiveWindow } from '@/src/core/slate/reactiveWindow';
import { generateRankedLeads, type BoardProp } from '@/src/core/slate/leadEngine';
import { advanceDemoTracking } from '@/src/core/slips/demoSlipTracker';
import { DraftSlipStore } from '@/src/core/slips/draftSlipStore';
import { createTrackingFromDraft, loadSlip, saveSlip } from '@/src/core/slips/storage';
import { withTraceId } from '@/src/core/trace/queryTrace';
import { deriveRunHeader, deriveSlipLearningHighlights } from '@/src/core/ui/deriveTruth';
import { OpenTicketsPanel } from '@/src/components/track/OpenTicketsPanel';
import type { SlipTrackingState } from '@/src/core/slips/trackingTypes';
import type { TodayPayload } from '@/src/core/today/types';
import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';

const statusTone: Record<SlipTrackingState['status'], string> = {
  alive: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  eliminated: 'bg-rose-500/15 text-rose-100 border-rose-400/40',
  settled: 'bg-slate-600/30 text-slate-100 border-slate-400/40'
};

export function TrackPageClient() {
  const router = useRouter();
  const nervous = useNervousSystem();
  const params = useSearchParams();
  const slipId = params.get('slipId') ?? '';
  const [state, setState] = useState<SlipTrackingState | null>(null);
  const [saved, setSaved] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [showTrackedToast, setShowTrackedToast] = useState(params.get('tracked') === '1');

  useEffect(() => {
    if (!slipId) return;
    const loaded = loadSlip(slipId);
    if (!loaded) return;
    setState(loaded);
  }, [slipId]);

  useEffect(() => {
    if (!state) return;
    const timer = window.setInterval(() => {
      const next = advanceDemoTracking(state, new Date().toISOString());
      setState(next);
      saveSlip(next);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [state]);

  const analysis = useMemo(() => {
    if (!state) return { failureLeg: null as SlipTrackingState['legs'][number] | null, wouldHaveHit: [], runbacks: [] as SlipTrackingState['legs'], grudgeGuard: undefined as string | undefined };
    const derived = deriveSlipLearningHighlights(state);
    const wouldHaveHit = state.legs.filter((leg) => leg.outcome === 'hit' && leg.legId !== state.eliminatedByLegId);
    return { failureLeg: derived.weakestLeg, wouldHaveHit, runbacks: derived.runbackCandidates, grudgeGuard: derived.grudgeGuard };
  }, [state]);

  const onSaveJournal = () => {
    if (!state) return;
    saveJournalEntry(buildJournalEntry(state));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const onTrackLatestDraft = () => {
    const draft = DraftSlipStore.getSlip();
    if (draft.length === 0) {
      router.push(appendQuery(nervous.toHref('/tonight'), {}));
      return;
    }
    const tracking = createTrackingFromDraft(draft, 'demo');
    saveSlip(tracking);
    router.push(appendQuery(withTraceId(nervous.toHref('/track'), nervous.trace_id ?? 'trace_demo_track'), { slipId: tracking.slipId }));
  };

  const onTracked = () => {
    setShowTrackedToast(true);
    router.push(appendQuery(withTraceId(nervous.toHref('/track'), nervous.trace_id ?? 'trace_demo_track'), { tracked: 1 }));
  };

  const onSampleSlip = async () => {
    setSampleLoading(true);
    try {
      const response = await fetch(nervous.toHref('/api/today'));
      const payload = await response.json() as { ok?: boolean; data?: TodayPayload };
      if (!payload.ok || !payload.data) return;

      const board: BoardProp[] = payload.data.games.flatMap((game, gameIndex) => game.propsPreview.map((prop, propIndex) => ({
        id: prop.id,
        player: prop.player,
        market: prop.market,
        line: prop.line ?? '0.5',
        odds: prop.odds ?? '-110',
        hitRateL10: prop.hitRateL10 ?? (56 + ((gameIndex + propIndex) % 20)),
        riskTag: prop.riskTag ?? (((gameIndex + propIndex) % 3 === 0) ? 'watch' : 'stable'),
        gameId: game.id
      })));

      const slateSummary = buildSlateSummary(payload.data);
      const reactiveWindow = detectReactiveWindow(payload.data);
      const rankedLeads = generateRankedLeads(board, slateSummary, {
        maxLeads: 7,
        diversifyAcrossGames: true,
        maxPerGame: 2,
        minConviction: 60,
        reactive: { isReactive: reactiveWindow.isReactive }
      });

      const selected = rankedLeads.slice(0, 7);
      if (selected.length < 5) return;

      const legs: SlipBuilderLeg[] = selected.map((lead) => ({
        id: lead.prop.id,
        player: lead.prop.player,
        marketType: lead.prop.market,
        line: lead.prop.line,
        odds: lead.prop.odds,
        game: lead.prop.gameId,
        confidence: lead.convictionScore / 100,
        volatility: lead.volatility
      }));

      DraftSlipStore.setSlip(legs);
      const tracking = createTrackingFromDraft(legs, payload.data.mode);
      saveSlip(tracking);
      router.push(appendQuery(withTraceId(nervous.toHref('/track'), nervous.trace_id ?? 'trace_demo_track'), { slipId: tracking.slipId }));
    } finally {
      setSampleLoading(false);
    }
  };

  const runHeader = deriveRunHeader({ trace_id: nervous.trace_id, mode: state?.mode });
  const surfaceMode = (state?.mode ?? nervous.mode) as 'demo' | 'cache' | 'live';
  const modeNote = surfaceMode === 'demo' ? 'Demo mode (live feeds off)' : surfaceMode === 'cache' ? 'Using cached slate' : 'Live feeds active';

  if (!state) {
    const hasDraft = DraftSlipStore.getSlip().length > 0;

    return (
      <section className="mx-auto max-w-6xl space-y-4 pb-20">
        <OpenTicketsPanel mode={surfaceMode} />
        {showTrackedToast ? <p className="text-xs text-emerald-200">Slip tracked.</p> : null}
        <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-6">
          <h1 className="text-xl font-semibold">No tracked slip yet</h1>
          <p className="mt-2 text-sm text-slate-300">{modeNote}</p>
          <p className="mt-1 text-sm text-slate-300">Track a slip to get live status + learning even after elimination.</p>
          <TrackSlipInput onTracked={onTracked} onOpenDraft={onTrackLatestDraft} onTrySample={onSampleSlip} sampleLoading={sampleLoading} />
          {!hasDraft ? <p className="mt-2 text-xs text-slate-400">No draft found yet. Build one in Tonight and come back.</p> : null}
        </section>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl space-y-4 pb-20">
      <OpenTicketsPanel mode={surfaceMode} />
      <header className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 space-y-2">
        <p className="text-xs text-slate-400">Slip ID: {state.slipId} · {runHeader.modeLabel} · {modeNote}</p>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs uppercase ${statusTone[state.status]}`}>{state.status}</span>
          {state.eliminatedByLegId ? <span className="text-sm text-rose-100">Eliminated by: {state.legs.find((leg) => leg.legId === state.eliminatedByLegId)?.player}</span> : null}
        </div>
        {state.status === 'eliminated' ? <p className="text-sm text-slate-300">Tracking remaining legs for learning.</p> : null}
      </header>

      <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
        <h2 className="text-lg font-semibold">Leg Tracker</h2>
        <ul className="mt-3 space-y-2">
          {state.legs.map((leg) => (
            <li key={leg.legId} className="rounded border border-slate-700 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p>{leg.player} · {leg.market} {leg.line}</p>
                <div className="flex gap-2 text-xs">
                  <span className="rounded border border-white/20 px-2 py-0.5">{leg.outcome}</span>
                  <span className="rounded border border-amber-300/30 px-2 py-0.5">{leg.volatility}</span>
                </div>
              </div>
              {typeof leg.currentValue === 'number' && typeof leg.targetValue === 'number' ? (
                <div className="mt-2">
                  <p className="text-xs text-slate-300">Progress: {leg.currentValue} / {leg.targetValue}</p>
                  <div className="mt-1 h-2 rounded bg-slate-800">
                    <div className="h-2 rounded bg-cyan-400" style={{ width: `${Math.min(100, Math.max(0, (leg.currentValue / Math.max(0.01, leg.targetValue)) * 100))}%` }} />
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {(state.status === 'eliminated' || state.status === 'settled') ? (
        <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 space-y-2">
          <h2 className="text-lg font-semibold">Postmortem Summary</h2>
          {analysis.failureLeg ? <p className="text-sm">Failure leg: {analysis.failureLeg.player} ({analysis.failureLeg.missType ?? 'unknown'})</p> : null}
          <p className="text-sm">Would-have-hit legs: {analysis.wouldHaveHit.length}</p>
          <ul className="list-disc pl-5 text-sm text-slate-300">
            {analysis.wouldHaveHit.map((leg) => <li key={leg.legId}>{leg.player} {leg.market} {leg.line}</li>)}
          </ul>
          <p className="text-sm">Runback candidates: {analysis.runbacks.length}</p>
          <ul className="list-disc pl-5 text-sm text-slate-300">
            {analysis.runbacks.map((leg) => <li key={`runback-${leg.legId}`}>{leg.player} {leg.market} {leg.line}</li>)}
          </ul>
          <p className="rounded border border-amber-300/40 bg-amber-500/10 p-2 text-sm text-amber-100">{analysis.grudgeGuard ?? 'Do not auto-blacklist. Need sample size.'}</p>
        </section>
      ) : null}

      <div className="flex items-center gap-2">
        <button type="button" className="rounded border border-cyan-400/70 bg-cyan-500/10 px-4 py-2 text-sm" onClick={onSaveJournal}>Save to Journal</button>
        {saved ? <span className="text-xs text-emerald-300">Saved</span> : null}
        <Link href={appendQuery(nervous.toHref('/journal'), {})} className="text-xs underline text-slate-300">Open Journal</Link>
      </div>
    </section>
  );
}
