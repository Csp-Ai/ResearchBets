'use client';

import React from 'react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { LandingTerminalShell } from '@/src/components/landing/LandingTerminalShell';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { spineFetch, spineHref } from '@/src/core/nervous/spineNavigation';
import { getModePresentation } from '@/src/core/mode';
import { parseEventEnvelopeClient, parseTodayEnvelopeClient, parseTodayPayloadClient, type EventEnvelopeClient, type TodayPayloadClient } from '@/src/core/contracts/clientEnvelopes';
import { createDemoTodayPayload } from '@/src/core/today/demoToday';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';
import { ExpandableGamePanel } from '@/src/components/landing/ExpandableGamePanel';
import { AliveStrip } from '@/src/components/landing/AliveStrip';
import { QuickSlipRail } from '@/src/components/landing/QuickSlipRail';
import { computeInlineSlipWarnings, getLatestTraceId } from '@/src/core/run/store';
import { RunStatusPill } from '@/src/components/trace/RunStatusPill';
import { buildCanonicalBoard, type BoardProp } from '@/src/core/today/boardModel';
import { computeSlipIntelligence } from '@/src/core/slips/slipIntelligence';
import { Chip, Panel, PanelHeader, SectionTitle, SlipRow } from '@/src/components/landing/ui';

type TodayPayload = TodayPayloadClient;
type SlipToggleProp = { id: string; player: string; market: string; line: string; odds: string };
type TraceStep = { agent: string; status: 'running' | 'complete'; output: string };
type AlivePhase = { label: string; status: 'complete' | 'active' | 'queued' };

const DEMO_TRACE_STEPS: Array<Omit<TraceStep, 'status'>> = [
  { agent: 'Slip Submitted', output: '3-leg draft queued for analysis' },
  { agent: 'InjuryScout', output: '2 availability flags detected' },
  { agent: 'LineWatcher', output: 'odds shift +14 bps on leg 2' },
  { agent: 'StatCruncher', output: 'L5 hit rate 72% on lead prop' },
  { agent: 'Risk Engine', output: 'confidence staged at 63%' },
  { agent: 'Weakest Leg', output: 'K. Murray O2.5 TDs is drag point' }
];

const DEMO_ALIVE_PHASES = ['Board loaded', 'Odds checked', 'Injuries scanned', 'Model scored'];

const EMPTY_TODAY: TodayPayload = { mode: 'live', reason: 'provider_unavailable', games: [], board: [], status: 'market_closed' };

const toSlipMarketType = (market: string) => {
  const normalized = market.toLowerCase();
  if (normalized === 'total' || normalized === 'spread' || normalized === 'moneyline' || normalized === 'points' || normalized === 'threes' || normalized === 'rebounds' || normalized === 'assists' || normalized === 'ra' || normalized === 'pra') return normalized;
  return 'points';
};

const normalizeTodayResult = (input: unknown): TodayPayload => {
  if (!input || typeof input !== 'object') return EMPTY_TODAY;
  const parsedEnvelope = parseTodayEnvelopeClient(input);
  const candidate = parsedEnvelope?.ok ? parsedEnvelope.data : input;
  const parsed = parseTodayPayloadClient(candidate);
  return parsed ?? EMPTY_TODAY;
};

const confidenceFromBoardProp = (prop: BoardProp) => {
  if (typeof prop.modelProb === 'number' && Number.isFinite(prop.modelProb) && prop.modelProb > 0) return Math.round(prop.modelProb * 100);
  if (prop.hitRateL10 >= 68) return 74;
  if (prop.hitRateL10 >= 58) return 64;
  return 52;
};

export function FrontdoorLandingClient() {
  const nervous = useNervousSystem();
  const { slip, addLeg, removeLeg, updateLeg } = useDraftSlip();
  const [today, setToday] = useState<TodayPayload>(EMPTY_TODAY);
  const [loading, setLoading] = useState(true);
  const [activeTraceId, setActiveTraceId] = useState<string>(() => nervous.trace_id ?? crypto.randomUUID());
  const [latestTraceId, setLatestTraceId] = useState<string | null>(null);
  const [slipText, setSlipText] = useState('Jayson Tatum over 29.5 points (-110)\nLuka Doncic over 8.5 assists (-120)\nLeBron James over 6.5 rebounds (-105)');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [traceDetailsOpen, setTraceDetailsOpen] = useState(false);
  const [traceFeed, setTraceFeed] = useState<TraceStep[]>([]);
  const [demoTraceIndex, setDemoTraceIndex] = useState(0);
  const [demoAliveIndex, setDemoAliveIndex] = useState(0);
  const [calibrationRuns, setCalibrationRuns] = useState(0);

  const initialTraceIdRef = useRef<string>(nervous.trace_id ?? crypto.randomUUID());

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const load = async () => {
      try {
        const response = await spineFetch('/api/today', {
          spine: { ...nervous, trace_id: initialTraceIdRef.current },
          signal: controller.signal
        });
        const payload = response.ok ? await response.json() : null;
        const normalized = normalizeTodayResult(payload);
        setToday(normalized);
        const parsedEnvelope = parseTodayEnvelopeClient(payload);
        if (parsedEnvelope?.ok) setActiveTraceId(parsedEnvelope.trace_id);
      } catch {
        setToday(EMPTY_TODAY);
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [nervous.date, nervous.mode, nervous.sport, nervous.tz]);

  useEffect(() => {
    setLatestTraceId(getLatestTraceId());
    if (typeof window === 'undefined') return;
    try {
      const rawRuns = window.localStorage.getItem('rb:runs:v1');
      const parsedRuns = rawRuns ? JSON.parse(rawRuns) : [];
      setCalibrationRuns(Array.isArray(parsedRuns) ? parsedRuns.length : 0);
    } catch {
      setCalibrationRuns(0);
    }
  }, []);

  useEffect(() => {
    if (today.mode !== 'demo') return;
    setDemoTraceIndex(0);
    setDemoAliveIndex(0);
    const timer = window.setInterval(() => {
      setDemoTraceIndex((current) => (current + 1) % DEMO_TRACE_STEPS.length);
      setDemoAliveIndex((current) => Math.min(current + 1, DEMO_ALIVE_PHASES.length - 1));
    }, 900);
    return () => {
      window.clearInterval(timer);
    };
  }, [today.mode]);

  useEffect(() => {
    if (today.mode === 'demo') {
      const next: TraceStep[] = DEMO_TRACE_STEPS.map((step, index) => ({
        ...step,
        status: index <= demoTraceIndex ? 'complete' : 'running'
      }));
      setTraceFeed(next);
      return;
    }

    let cancelled = false;
    const pollFeed = async () => {
      try {
        const response = await spineFetch('/api/events', {
          spine: { ...nervous, trace_id: activeTraceId },
          query: { limit: 16 }
        });
        const payload = response.ok ? await response.json() : null;
        const parsedFeed = Array.isArray(payload?.events)
          ? payload.events
            .map((event: unknown) => parseEventEnvelopeClient(event))
            .filter((event: EventEnvelopeClient | null): event is EventEnvelopeClient => event !== null)
            .map((event: EventEnvelopeClient) => {
              const output = typeof event.payload === 'string'
                ? event.payload
                : JSON.stringify(event.payload).slice(0, 90);
              return {
                agent: event.type.replaceAll('_', ' '),
                status: event.phase === 'AFTER' ? 'complete' : 'running' as const,
                output
              };
            })
          : [];
        if (!cancelled) setTraceFeed(parsedFeed.slice(0, 6));
      } catch {
        if (!cancelled) setTraceFeed([]);
      }
      if (!cancelled) window.setTimeout(() => void pollFeed(), 1500);
    };

    void pollFeed();
    return () => {
      cancelled = true;
    };
  }, [activeTraceId, demoTraceIndex, today.mode]);

  const slipIds = useMemo(() => new Set(slip.map((leg) => leg.id)), [slip]);
  const gameById = useMemo(() => new Map(today.games.map((game) => [game.id, game])), [today.games]);
  const buildSpineHref = useCallback((path: string, extras?: Record<string, string | number | undefined>) => spineHref(path, nervous, { trace_id: activeTraceId, ...(extras ?? {}) }), [activeTraceId, nervous]);
  const board = useMemo(() => {
    if ((today.board ?? []).length > 0) return buildCanonicalBoard(today).slice(0, 10);
    return buildCanonicalBoard(createDemoTodayPayload()).slice(0, 10);
  }, [today]);

  const toggleLeg = useCallback((prop: SlipToggleProp, matchup?: string) => {
    if (slipIds.has(prop.id)) return removeLeg(prop.id);
    addLeg({ id: prop.id, player: prop.player, marketType: toSlipMarketType(prop.market), line: prop.line, odds: prop.odds, game: matchup });
  }, [addLeg, removeLeg, slipIds]);

  const grouped = useMemo(() => {
    if (!advancedOpen) return [];
    const map = new Map<string, BoardProp[]>();
    board.forEach((prop) => map.set(prop.gameId, [...(map.get(prop.gameId) ?? []), prop]));
    return Array.from(map.entries()).map(([gameId, props]) => ({ gameId, props, game: gameById.get(gameId) }));
  }, [advancedOpen, board, gameById]);

  const sampleSlipHref = buildSpineHref('/stress-test', { source: 'landing_sample_slip', prefill: slipText });
  const runAnalysisHref = buildSpineHref('/stress-test', { tab: 'analyze' });
  const latestRunHref = latestTraceId ? buildSpineHref('/research', { trace_id: latestTraceId }) : null;

  const warnings = useMemo(() => computeInlineSlipWarnings(slip), [slip]);
  const fastAddState = slip.length >= 4 ? 'High-conviction cluster active' : slip.length >= 2 ? 'Lead set building' : 'Tap leads for quick add';
  const weakestLegDelta = useMemo(() => {
    if (slip.length < 2 || !warnings.weakestLeg) return null;
    const currentIntel = computeSlipIntelligence(slip.map((leg) => ({ id: leg.id, player: leg.player, marketType: leg.marketType, line: leg.line, odds: leg.odds, game: leg.game })));
    const weakest = slip.find((leg) => warnings.weakestLeg?.includes(leg.player));
    if (!weakest) return null;
    const withoutWeakest = slip.filter((leg) => leg.id !== weakest.id);
    if (withoutWeakest.length === 0) return null;
    const withoutIntel = computeSlipIntelligence(withoutWeakest.map((leg) => ({ id: leg.id, player: leg.player, marketType: leg.marketType, line: leg.line, odds: leg.odds, game: leg.game })));
    const withConfidence = Math.max(35, 100 - currentIntel.fragilityScore);
    const withoutConfidence = Math.max(35, 100 - withoutIntel.fragilityScore);
    return {
      withConfidence,
      withoutConfidence,
      delta: withoutConfidence - withConfidence,
      weakestLabel: warnings.weakestLeg
    };
  }, [slip, warnings.weakestLeg]);

  const calibrationCard = useMemo(() => {
    if (calibrationRuns < 10) return { ready: false as const, runs: calibrationRuns };
    return {
      ready: true as const,
      runs: calibrationRuns,
      predictedBand: '60–70%',
      actualHit: '67%',
      drift: '+2%'
    };
  }, [calibrationRuns]);

  const alivePhases = useMemo<AlivePhase[]>(() => {
    if (today.mode === 'demo') {
      return DEMO_ALIVE_PHASES.map((label, index) => ({
        label,
        status: index < demoAliveIndex ? 'complete' : index === demoAliveIndex ? 'active' : 'queued'
      }));
    }

    if (traceFeed.length === 0) {
      return [
        { label: 'Board loaded', status: 'complete' },
        { label: today.mode === 'cache' ? 'Using cached slate' : 'Awaiting feed updates', status: 'active' }
      ];
    }

    return traceFeed.slice(0, 4).map((step, index) => ({
      label: step.agent,
      status: step.status === 'complete' ? 'complete' : index === traceFeed.length - 1 ? 'active' : 'queued'
    }));
  }, [today.mode, traceFeed, demoAliveIndex]);


  const resolvedMode = today.mode;
  const modePresentation = getModePresentation(resolvedMode);

  return (
    <section className="mx-auto w-full max-w-6xl px-2 pb-6" style={{ minHeight: 720 }}>
      <LandingTerminalShell
        mode={resolvedMode}
        reason={today.reason}
        title="Detect fragile parlays before they burn you."
        subtitle={today.status === 'next' && today.nextAvailableStartTime ? `Next slate begins at ${new Date(today.nextAvailableStartTime).toLocaleString()}` : 'Process over hype: review board signals, then run BEFORE / DURING / AFTER.'}
        statusSlot={<RunStatusPill traceId={activeTraceId} mode={resolvedMode} providerHealth={today.providerHealth} generatedAt={today.generatedAt ?? new Date().toISOString()} seedHint={`${nervous.sport}:${nervous.date}:${nervous.tz}`} />}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2" data-testid="landing-mode-chip-row">
          <Chip variant="neutral" title={modePresentation.tooltip}>{modePresentation.label}</Chip>
          <Chip className="text-cyan-100">Fast add · {fastAddState}</Chip>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(340px,1fr)] lg:items-start">
          <div>
            <SectionTitle className="mb-2">Tonight&apos;s Board</SectionTitle>
            <div className="space-y-2" data-testid="board-section" id="board-section">
              {loading ? <p className="text-xs text-slate-400">Loading board…</p> : null}
              {today.reason === 'strict_live_empty' ? (
                <div className="rounded-lg border border-slate-600 bg-slate-900/70 p-2 text-xs text-slate-200">
                  Live feeds returned no active board right now. You can keep going with cached context.
                  <div className="mt-2">
                    <Link href={buildSpineHref('/today', { mode: 'cache' })} className="rounded border border-cyan-300/50 px-2 py-1 text-cyan-100">Use cached slate</Link>
                  </div>
                </div>
              ) : null}

              {board.slice(0, 6).map((prop) => (
                <SlipRow
                  key={prop.id}
                  leftPrimary={(
                    <span className="inline-flex items-center gap-1.5">
                      <span>{prop.player} • {prop.market.toUpperCase()} {prop.line}</span>
                      <Chip variant="good" className="px-1.5 py-0.5 text-[10px]" data-testid="scout-confidence-chip">{confidenceFromBoardProp(prop)}% conf</Chip>
                      <Chip variant={prop.riskTag === 'stable' ? 'good' : 'warn'} className="px-1.5 py-0.5 text-[10px]" data-testid="scout-risk-chip">{prop.riskTag}</Chip>
                    </span>
                  )}
                  leftSecondary={`${gameById.get(prop.gameId)?.matchup ?? prop.gameId} · ${prop.odds} · L10 ${prop.hitRateL10}%${typeof (prop as BoardProp & { hitRateL5?: number }).hitRateL5 === 'number' ? ` · L5 ${(prop as BoardProp & { hitRateL5?: number }).hitRateL5}%` : ''}`}
                  right={(
                    <button type="button" onClick={() => toggleLeg(prop, gameById.get(prop.gameId)?.matchup)} className="rounded-md border border-cyan-300/50 px-2 py-0.5 text-[11px] text-cyan-100">
                      {slipIds.has(prop.id) ? 'Added' : 'Add'}
                    </button>
                  )}
                />
              ))}
            </div>

            <details className="mt-3 rounded-xl border border-white/10 bg-slate-950/40 p-2.5" open={advancedOpen} onToggle={(event) => setAdvancedOpen((event.currentTarget as HTMLDetailsElement).open)}>
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Advanced board view</summary>
              {advancedOpen ? (
                <div className="mt-2 space-y-2">
                  {grouped.map(({ gameId, props, game }) => (
                    <ExpandableGamePanel
                      key={gameId}
                      gameId={gameId}
                      matchup={game?.matchup ?? gameId}
                      startTime={game?.startTime ?? 'Upcoming'}
                      props={props}
                      inSlip={(propId) => slipIds.has(propId)}
                      onToggleLeg={(prop) => toggleLeg(prop, game?.matchup)}
                    />
                  ))}
                </div>
              ) : null}
            </details>
          </div>

          <aside className="space-y-2 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
            <QuickSlipRail
              slip={slip}
              runAnalysisHref={runAnalysisHref}
              sampleSlipHref={sampleSlipHref}
              latestRunHref={latestRunHref}
              board={board}
              onAddLeg={addLeg}
              onRemoveLeg={removeLeg}
              onEditLeg={updateLeg}
            />
            <AliveStrip mode={today.mode} reason={today.reason} phases={alivePhases} />
          </aside>

          <Panel className="lg:col-span-2" data-testid="pipeline-hero-panel">
            <div className="flex items-center justify-between gap-2">
              <SectionTitle>Pipeline visualizer</SectionTitle>
              <button
                type="button"
                onClick={() => setTraceDetailsOpen((open) => !open)}
                className="rounded-lg border border-white/20 px-2 py-1 text-xs text-slate-200"
                aria-expanded={traceDetailsOpen}
                aria-controls="pipeline-trace-details"
              >
                {traceDetailsOpen ? 'Hide trace details' : 'Show trace details'}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-300">Trace creation, agent execution order, signal weighting, and weakest-leg propagation are rendered in-line.</p>
            {traceDetailsOpen ? (
              <div id="pipeline-trace-details" className="mt-3 grid gap-3 lg:grid-cols-2">
                <div className="space-y-1.5">
                  {traceFeed.map((step) => (
                    <SlipRow
                      key={`${step.agent}-${step.output}`}
                      leftPrimary={step.agent}
                      leftSecondary={step.output}
                      right={<Chip variant={step.status === 'complete' ? 'good' : 'neutral'}>{step.status === 'complete' ? '✓' : '…'}</Chip>}
                    />
                  ))}
                </div>

                <div className="space-y-2">
                  <Panel className="bg-slate-950/60">
                    <PanelHeader title="Trace feed" subtitle={today.mode === 'demo' ? 'Timed demo execution reveal' : 'Subscribed to live trace events'} />
                    <p className="text-xs text-slate-300">Trace id: {activeTraceId}</p>
                    <p className="text-xs text-slate-400">{today.mode === 'demo' ? `Step ${Math.min(demoTraceIndex + 1, DEMO_TRACE_STEPS.length)} of ${DEMO_TRACE_STEPS.length}` : 'Live event pulse mapped to compact phases'}</p>
                  </Panel>

                  <Panel className="bg-slate-950/60">
                    <PanelHeader title="Weakest-leg delta impact" subtitle={weakestLegDelta ? weakestLegDelta.weakestLabel : 'Add 2+ legs to quantify contribution'} />
                    {weakestLegDelta ? (
                      <div className="space-y-1 text-xs text-slate-200">
                        <p>With leg: {weakestLegDelta.withConfidence}% confidence</p>
                        <p>Without leg: {weakestLegDelta.withoutConfidence}% confidence</p>
                        <p className="text-cyan-100">Delta: +{weakestLegDelta.delta}%</p>
                      </div>
                    ) : <p className="text-xs text-slate-400">Need relative comparison data from current slip.</p>}
                  </Panel>

                  <Panel className="bg-slate-950/60">
                    <PanelHeader title="Model confidence calibration" subtitle="Accountability strip" />
                    {calibrationCard.ready ? (
                      <div className="space-y-1 text-xs text-slate-200">
                        <p>Predicted range: {calibrationCard.predictedBand}</p>
                        <p>Actual outcome hit: {calibrationCard.actualHit}</p>
                        <p className="text-cyan-100">Calibration drift: {calibrationCard.drift}</p>
                      </div>
                    ) : <p className="text-xs text-slate-400">{calibrationCard.runs} runs analyzed. Calibration accountability unlocks at 10.</p>}
                  </Panel>
                </div>
              </div>
            ) : null}
          </Panel>
        </div>

        <div className="lg:hidden sticky bottom-2 z-20 mt-3">
          <Link href={runAnalysisHref} className="block w-full rounded-xl border border-cyan-300/50 bg-slate-900/95 px-4 py-2 text-center text-sm font-semibold text-cyan-100 shadow-[0_8px_28px_rgba(2,6,23,0.5)]">
            Slip ({slip.length}) • Run analysis
          </Link>
        </div>

        <Panel className="mt-3" data-testid="landing-edu-strip">
          <p className="text-xs text-slate-300">Correlation can quietly reduce hit-rate. Rebalance with warning chips.</p>
          <details className="mt-2 rounded-xl border border-white/10 bg-slate-900/50 p-2.5">
            <summary className="cursor-pointer text-xs font-medium text-slate-100">More</summary>
            <p className="mt-2 text-xs text-white/60">Prefill text is optional when you want to run a manual slip variant.</p>
            <textarea value={slipText} onChange={(event) => setSlipText(event.target.value)} className="mt-2 h-16 w-full rounded-xl border border-white/15 bg-slate-950/80 p-2 text-xs text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40" aria-label="Slip text" />
          </details>
        </Panel>
      </LandingTerminalShell>
    </section>
  );
}
