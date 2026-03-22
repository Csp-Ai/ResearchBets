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
import { deriveRunHeader } from '@/src/core/ui/deriveTruth';
import { OpenTicketsPanel } from '@/src/components/track/OpenTicketsPanel';
import { DuringStageTracker } from '@/src/components/track/DuringStageTracker';
import type { SlipTrackingState } from '@/src/core/slips/trackingTypes';
import type { TodayPayload } from '@/src/core/today/types';
import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { getSourceQualityCopy } from '@/src/core/ui/truthPresentation';
import { DecisionThreadStrip } from '@/src/components/nervous/DecisionThreadStrip';
import { deriveAfterCommandSurface } from '@/src/core/cockpit/ticketLoop';

const statusTone: Record<SlipTrackingState['status'], string> = {
  alive: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  eliminated: 'bg-rose-500/15 text-rose-100 border-rose-400/40',
  settled: 'bg-slate-600/30 text-slate-100 border-slate-400/40'
};

export function readTrackSlipIdFromQuery(params: URLSearchParams): string {
  const canonical = params.get('slip_id');
  if (canonical) return canonical;
  // Compatibility boundary: keep legacy camelCase read only for old shared links.
  return params.get('slipId') ?? '';
}

export function readTrackContinuityTagFromQuery(params: URLSearchParams): string {
  return params.get('continuity') ?? '';
}
export function TrackPageClient() {
  const router = useRouter();
  const nervous = useNervousSystem();
  const params = useSearchParams();
  const slipId = readTrackSlipIdFromQuery(params);
  const continuityTag = readTrackContinuityTagFromQuery(params);
  const traceIdFromQuery = params.get('trace_id') ?? params.get('traceId') ?? '';
  const [state, setState] = useState<SlipTrackingState | null>(null);
  const [saved, setSaved] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [showTrackedToast, setShowTrackedToast] = useState(params.get('tracked') === '1');
  const [isHydratingTicket, setIsHydratingTicket] = useState(Boolean(slipId));

  useEffect(() => {
    if (!slipId) {
      setIsHydratingTicket(false);
      return;
    }
    const loaded = loadSlip(slipId);
    if (loaded) setState(loaded);
    setIsHydratingTicket(false);
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

  const afterCommand = useMemo(
    () =>
      state && (state.status === 'eliminated' || state.status === 'settled')
        ? deriveAfterCommandSurface(state)
        : null,
    [state]
  );

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
    const identity = DraftSlipStore.getIdentity();
    const tracking = createTrackingFromDraft(draft, 'demo', identity);
    saveSlip(tracking);
    const nextTraceId =
      tracking.trace_id ?? identity.trace_id ?? traceIdFromQuery ?? nervous.trace_id;
    router.push(
      appendQuery(nervous.toHref('/track'), { slip_id: tracking.slipId, trace_id: nextTraceId })
    );
  };

  const onTracked = () => {
    setShowTrackedToast(true);
    router.push(
      appendQuery(withTraceId(nervous.toHref('/track'), nervous.trace_id ?? 'trace_demo_track'), {
        tracked: 1
      })
    );
  };

  const onSampleSlip = async () => {
    setSampleLoading(true);
    try {
      const response = await fetch(nervous.toHref('/api/today'));
      const payload = (await response.json()) as { ok?: boolean; data?: TodayPayload };
      if (!payload.ok || !payload.data) return;

      const board: BoardProp[] = payload.data.games.flatMap((game, gameIndex) =>
        game.propsPreview.map((prop, propIndex) => ({
          id: prop.id,
          player: prop.player,
          market: prop.market,
          line: prop.line ?? '0.5',
          odds: prop.odds ?? '-110',
          hitRateL10: prop.hitRateL10 ?? 56 + ((gameIndex + propIndex) % 20),
          riskTag: prop.riskTag ?? ((gameIndex + propIndex) % 3 === 0 ? 'watch' : 'stable'),
          gameId: game.id
        }))
      );

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
      const identity = DraftSlipStore.getIdentity();
      const tracking = createTrackingFromDraft(legs, payload.data.mode, identity);
      saveSlip(tracking);
      const nextTraceId =
        tracking.trace_id ?? identity.trace_id ?? traceIdFromQuery ?? nervous.trace_id;
      router.push(
        appendQuery(nervous.toHref('/track'), { slip_id: tracking.slipId, trace_id: nextTraceId })
      );
    } finally {
      setSampleLoading(false);
    }
  };

  const runHeader = deriveRunHeader({
    trace_id: state?.trace_id ?? traceIdFromQuery ?? nervous.trace_id,
    mode: state?.mode
  });
  const surfaceMode = (state?.mode ?? nervous.mode) as 'demo' | 'cache' | 'live';
  const modeNote =
    surfaceMode === 'demo'
      ? 'Demo mode (live feeds off)'
      : surfaceMode === 'cache'
        ? 'Using cached slate'
        : 'Live feeds active';
  const sourceQuality = getSourceQualityCopy({ mode: surfaceMode });
  const continuityLabel =
    continuityTag === 'staged_ticket'
      ? 'Continuation active: Staged from Board → Tracking run'
      : 'Tracking run';

  if (!state) {
    const hasDraft = DraftSlipStore.getSlip().length > 0;

    return (
      <section className="mx-auto max-w-6xl space-y-4 pb-20">
        <OpenTicketsPanel mode={surfaceMode} />
        <DuringStageTracker trace_id={nervous.trace_id} mode={surfaceMode} />
        <DecisionThreadStrip
          activeStage="track"
          contextLabel={
            continuityTag === 'staged_ticket'
              ? 'Continuation: this tracking run follows your staged board decision and stays in the learning loop.'
              : 'Track keeps the learning loop live from verdict to outcome.'
          }
        />
        {showTrackedToast ? <p className="text-xs text-emerald-200">Slip tracked.</p> : null}
        <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-6">
          {isHydratingTicket ? (
            <div className="mb-3 space-y-2" aria-label="Ticket loading">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : null}
          <h1 className="text-xl font-semibold">No tracked slip yet</h1>
          <p className="mt-2 text-sm text-slate-300">{modeNote}</p>
          <p className="mt-1 text-xs text-slate-400" title={sourceQuality.detail}>
            {sourceQuality.label}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Track a slip to continue the same decision thread through outcome and learning.
          </p>
          <p className="mt-1 text-xs text-cyan-100">{continuityLabel}</p>
          <TrackSlipInput
            onTracked={onTracked}
            onOpenDraft={onTrackLatestDraft}
            onTrySample={onSampleSlip}
            sampleLoading={sampleLoading}
          />
          {!hasDraft ? (
            <p className="mt-2 text-xs text-slate-400">
              No draft found yet. Build one in Tonight and come back.
            </p>
          ) : null}
        </section>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl space-y-4 pb-20">
      <OpenTicketsPanel mode={surfaceMode} />
      <DuringStageTracker trace_id={nervous.trace_id} mode={surfaceMode} />
      <DecisionThreadStrip
        activeStage="track"
        contextLabel={
          continuityTag === 'staged_ticket'
            ? 'Continuation: this tracking run follows your staged board decision and stays in the learning loop.'
            : 'Track keeps the learning loop live from verdict to outcome.'
        }
      />
      <header className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 space-y-2">
        {isHydratingTicket ? (
          <div className="space-y-2" aria-label="Ticket loading">
            <Skeleton className="h-3 w-56" />
            <Skeleton className="h-6 w-32 rounded-full" />
          </div>
        ) : null}
        <p className="text-xs text-slate-400">
          Slip ID: {state.slipId} · {runHeader.modeLabel} · {modeNote}
        </p>
        <p className="text-xs text-cyan-100">{continuityLabel}</p>
        <p className="text-xs text-slate-500" title={sourceQuality.detail}>
          {sourceQuality.label}
        </p>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs uppercase ${statusTone[state.status]}`}
          >
            {state.status}
          </span>
          {state.eliminatedByLegId ? (
            <span className="text-sm text-rose-100">
              Eliminated by:{' '}
              {state.legs.find((leg) => leg.legId === state.eliminatedByLegId)?.player}
            </span>
          ) : null}
        </div>
        {state.status === 'eliminated' ? (
          <p className="text-sm text-slate-300">
            Ticket busted, but keep tracking remaining legs for learning.
          </p>
        ) : null}
      </header>

      <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
        <h2 className="text-lg font-semibold">Leg Tracker</h2>
        <ul className="mt-3 space-y-2">
          {state.legs.map((leg) => (
            <li key={leg.legId} className="rounded border border-slate-700 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p>
                  {leg.player} · {leg.market} {leg.line}
                </p>
                <div className="flex gap-2 text-xs">
                  <span className="rounded border border-white/20 px-2 py-0.5">{leg.outcome}</span>
                  <span className="rounded border border-amber-300/30 px-2 py-0.5">
                    {leg.volatility}
                  </span>
                </div>
              </div>
              {typeof leg.currentValue === 'number' && typeof leg.targetValue === 'number' ? (
                <div className="mt-2">
                  <p className="text-xs text-slate-300">
                    Progress: {leg.currentValue} / {leg.targetValue}
                  </p>
                  <div className="mt-1 h-2 rounded bg-slate-800">
                    <div
                      className="h-2 rounded bg-cyan-400"
                      style={{
                        width: `${Math.min(100, Math.max(0, (leg.currentValue / Math.max(0.01, leg.targetValue)) * 100))}%`
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {afterCommand?.after ? (
        <section
          className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 space-y-4"
          aria-label="After command surface"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">
                After command surface
              </p>
              <h2 className="text-lg font-semibold">{afterCommand.after.closingHeadline}</h2>
              <p className="text-sm text-slate-300">{afterCommand.after.decidedBy}</p>
            </div>
            <div
              className={`rounded-full border px-3 py-1 text-xs uppercase ${afterCommand.after.outcomeTone === 'positive' ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100' : afterCommand.after.outcomeTone === 'negative' ? 'border-rose-400/40 bg-rose-500/10 text-rose-100' : afterCommand.after.outcomeTone === 'caution' ? 'border-amber-300/40 bg-amber-500/10 text-amber-100' : 'border-slate-400/40 bg-slate-500/10 text-slate-100'}`}
            >
              {afterCommand.after.outcomeLabel}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-3 text-xs">
              <p className="uppercase tracking-[0.18em] text-emerald-200/80">Strongest leg</p>
              <p className="mt-2 font-semibold text-slate-100">
                {afterCommand.after.winningLegHighlight
                  ? `${afterCommand.after.winningLegHighlight.player} ${afterCommand.after.winningLegHighlight.marketLabel} — ${afterCommand.after.winningLegHighlight.status}`
                  : 'No cleared leg preserved'}
              </p>
              <p className="mt-1 text-slate-300">
                {afterCommand.after.winningLegHighlight?.why ??
                  'Settlement did not preserve a single carrying winner.'}
              </p>
            </article>
            <article className="rounded-lg border border-rose-400/20 bg-rose-500/5 p-3 text-xs">
              <p className="uppercase tracking-[0.18em] text-rose-200/80">Weakest leg</p>
              <p className="mt-2 font-semibold text-slate-100">
                {afterCommand.after.breakingLegHighlight
                  ? `${afterCommand.after.breakingLegHighlight.player} ${afterCommand.after.breakingLegHighlight.marketLabel} — ${afterCommand.after.breakingLegHighlight.status}`
                  : 'No breaking leg preserved'}
              </p>
              <p className="mt-1 text-slate-300">
                {afterCommand.after.breakingLegHighlight?.why ??
                  'No single leg broke the ticket at settlement.'}
              </p>
            </article>
            <article className="rounded-lg border border-white/10 bg-slate-950/60 p-3 text-xs">
              <p className="uppercase tracking-[0.18em] text-slate-400">Near miss</p>
              <p className="mt-2 font-semibold text-slate-100">
                {afterCommand.after.nearMissHighlight ?? 'No near-miss proof preserved'}
              </p>
              <p className="mt-1 text-slate-300">{afterCommand.gameScript}</p>
            </article>
            <article className="rounded-lg border border-cyan-400/20 bg-cyan-500/5 p-3 text-xs">
              <p className="uppercase tracking-[0.18em] text-cyan-200/80">What to learn</p>
              <p className="mt-2 font-semibold text-slate-100">{afterCommand.after.lesson}</p>
              <p className="mt-1 text-slate-300">Next move stays in the same command loop.</p>
            </article>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={nervous.toHref('/history')}
              className="rounded border border-white/20 px-3 py-2 text-xs text-slate-100"
            >
              Review archive
            </Link>
            <Link
              href={afterCommand.nextActionHref ?? nervous.toHref('/cockpit')}
              className="rounded border border-cyan-400/60 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100"
            >
              {afterCommand.nextActionLabel}
            </Link>
            <Link
              href={appendQuery(nervous.toHref('/cockpit'), { source: 'track_after' })}
              className="rounded border border-white/20 px-3 py-2 text-xs text-slate-100"
            >
              Reopen board
            </Link>
          </div>
        </section>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded border border-cyan-400/70 bg-cyan-500/10 px-4 py-2 text-sm"
          onClick={onSaveJournal}
        >
          Save to Journal
        </button>
        {saved ? <span className="text-xs text-emerald-300">Saved</span> : null}
        <Link
          href={appendQuery(nervous.toHref('/journal'), {})}
          className="text-xs underline text-slate-300"
        >
          Open Journal
        </Link>
      </div>
    </section>
  );
}
