'use client';

import React from 'react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { appendQuery } from '@/src/components/landing/navigation';
import { LandingTerminalShell } from '@/src/components/landing/LandingTerminalShell';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { EventEnvelopeSchema, TodayPayloadSchema } from '@/src/core/contracts/envelopes';
import { deriveModePolicy, getModePresentation, persistMode, readPersistedMode } from '@/src/core/mode';
import { parseTodayEnvelope } from '@/src/core/today/todayApiAdapter';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';
import { FeedStatusChip } from '@/src/components/landing/FeedStatusChip';
import { ExpandableGamePanel } from '@/src/components/landing/ExpandableGamePanel';
import { computeInlineSlipWarnings, getLatestTraceId } from '@/src/core/run/store';
import { withTraceId } from '@/src/core/trace/queryTrace';
import { Chip, Divider, MicroBar, Panel, PanelHeader, SectionTitle, SlipRow } from '@/src/components/landing/ui';

type TodayPayload = typeof TodayPayloadSchema._type;
type BoardProp = TodayPayload['board'][number] & {
  team?: string;
  hitRateL10?: number;
  hitRateL5?: number;
  confidencePct?: number;
  riskTag?: string;
  edgeDelta?: number;
};
type SlipToggleProp = Pick<BoardProp, 'id' | 'player' | 'market' | 'line' | 'odds'>;

const EMPTY_TODAY: TodayPayload = { mode: 'live', reason: 'provider_unavailable', games: [], board: [], status: 'market_closed' };

const toSlipMarketType = (market: string) => {
  const normalized = market.toLowerCase();
  if (normalized === 'total' || normalized === 'spread' || normalized === 'moneyline' || normalized === 'points' || normalized === 'threes' || normalized === 'rebounds' || normalized === 'assists' || normalized === 'ra' || normalized === 'pra') return normalized;
  return 'points';
};

const normalizeTodayResult = (input: unknown): TodayPayload => {
  if (!input || typeof input !== 'object') return EMPTY_TODAY;
  const parsedEnvelope = parseTodayEnvelope(input);
  const candidate = parsedEnvelope.success && parsedEnvelope.data.ok ? parsedEnvelope.data.data : input;
  const parsed = TodayPayloadSchema.safeParse(candidate);
  return parsed.success ? parsed.data : EMPTY_TODAY;
};

export function FrontdoorLandingClient() {
  const router = useRouter();
  const nervous = useNervousSystem();
  const { slip, addLeg, removeLeg } = useDraftSlip();
  const [today, setToday] = useState<TodayPayload>(EMPTY_TODAY);
  const [loading, setLoading] = useState(true);
  const [activeTraceId, setActiveTraceId] = useState<string>(() => nervous.trace_id ?? crypto.randomUUID());
  const [latestTraceId, setLatestTraceId] = useState<string | null>(null);
  const [slipText, setSlipText] = useState('Jayson Tatum over 29.5 points (-110)\nLuka Doncic over 8.5 assists (-120)');
  const [runStage, setRunStage] = useState<'before' | 'during' | 'after'>('before');
  const [slipPulse, setSlipPulse] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const initialTraceIdRef = useRef<string>(nervous.trace_id ?? crypto.randomUUID());

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const load = async () => {
      const href = appendQuery('/api/today', { sport: nervous.sport, tz: nervous.tz, date: nervous.date, mode: nervous.mode, trace_id: initialTraceIdRef.current });
      try {
        const response = await fetch(href, { cache: 'no-store', signal: controller.signal });
        const payload = response.ok ? await response.json() : null;
        const normalized = normalizeTodayResult(payload);
        setToday(normalized);
        const parsedEnvelope = parseTodayEnvelope(payload);
        if (parsedEnvelope.success && parsedEnvelope.data.ok) setActiveTraceId(parsedEnvelope.data.trace_id);
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
  }, []);

  useEffect(() => {
    if (runStage !== 'during') return;
    if (today.mode === 'demo') {
      const toAfter = window.setTimeout(() => setRunStage('after'), 1400);
      return () => {
        window.clearTimeout(toAfter);
      };
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const href = appendQuery('/api/events', { trace_id: activeTraceId, limit: 8 });
        const response = await fetch(href, { cache: 'no-store' });
        const payload = response.ok ? await response.json() : null;
        const items = Array.isArray(payload?.events)
          ? payload.events
            .map((event: unknown) => EventEnvelopeSchema.safeParse(event))
            .filter((parsed: ReturnType<typeof EventEnvelopeSchema.safeParse>): parsed is { success: true; data: typeof EventEnvelopeSchema._type } => parsed.success)
            .map((parsed: { success: true; data: typeof EventEnvelopeSchema._type }) => parsed.data)
          : [];
        const hasAfter = items.some((event: typeof EventEnvelopeSchema._type) => event.phase === 'AFTER');
        if (!cancelled && hasAfter) {
          setRunStage('after');
          return;
        }
      } catch {
        if (!cancelled) setRunStage('after');
      }
      if (!cancelled) window.setTimeout(() => void poll(), 1200);
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [runStage, today.mode, activeTraceId]);

  const slipIds = useMemo(() => new Set(slip.map((leg) => leg.id)), [slip]);
  const gameById = useMemo(() => new Map(today.games.map((game) => [game.id, game])), [today.games]);
  const spineHref = useCallback((path: string, extras?: Record<string, string | number | undefined>) => nervous.toHref(path, { trace_id: activeTraceId, ...(extras ?? {}) }), [activeTraceId, nervous]);
  const board = useMemo(() => (today.board.slice(0, 10) as BoardProp[]), [today.board]);

  const toggleLeg = useCallback((prop: SlipToggleProp, matchup?: string) => {
    if (slipIds.has(prop.id)) return removeLeg(prop.id);
    addLeg({ id: prop.id, player: prop.player, marketType: toSlipMarketType(prop.market), line: prop.line, odds: prop.odds, game: matchup });
    setRunStage('before');
    setSlipPulse(true);
    window.setTimeout(() => setSlipPulse(false), 260);
  }, [addLeg, removeLeg, slipIds]);

  const grouped = useMemo(() => {
    if (!advancedOpen) return [];
    const map = new Map<string, BoardProp[]>();
    board.forEach((prop) => map.set(prop.gameId, [...(map.get(prop.gameId) ?? []), prop]));
    return Array.from(map.entries()).map(([gameId, props]) => ({ gameId, props, game: gameById.get(gameId) }));
  }, [advancedOpen, board, gameById]);

  const marketClosed = today.status === 'market_closed';
  const sampleSlipHref = appendQuery(withTraceId(spineHref('/stress-test'), activeTraceId), { source: 'landing_sample_slip', prefill: slipText });
  const latestRunHref = latestTraceId ? withTraceId(spineHref('/research'), latestTraceId) : null;

  const onAnalyze = useCallback(() => {
    setRunStage('during');
    router.push(sampleSlipHref);
  }, [router, sampleSlipHref]);

  const warnings = useMemo(() => computeInlineSlipWarnings(slip), [slip]);
  const fastAddState = slip.length >= 4 ? 'High-conviction cluster active' : slip.length >= 2 ? 'Lead set building' : 'Tap leads for quick add';

  const trackerSteps = [
    { id: 'before', label: 'BEFORE', done: runStage !== 'before' },
    { id: 'during', label: 'DURING', done: runStage === 'after' },
    { id: 'after', label: 'AFTER', done: runStage === 'after' }
  ] as const;

  const modeDecision = deriveModePolicy({ requestedMode: nervous.mode ?? readPersistedMode(), envelopeMode: today.mode });
  const modePresentation = getModePresentation(modeDecision.mode);

  useEffect(() => {
    persistMode(modeDecision.mode);
  }, [modeDecision.mode]);

  return (
    <section className="mx-auto w-full max-w-6xl px-2 pb-6" style={{ minHeight: 720 }}>
      <LandingTerminalShell
        mode={modeDecision.mode}
        reason={today.reason}
        title="Decision-first board + slip rail"
        subtitle={today.status === 'next' && today.nextAvailableStartTime ? `Next slate begins at ${new Date(today.nextAvailableStartTime).toLocaleString()}` : 'Process over hype: review board signals, then run BEFORE / DURING / AFTER.'}
        statusSlot={<FeedStatusChip health={(today.providerHealth as Array<{ provider: string; ok: boolean; message?: string; missingKey?: boolean }> | undefined)} />}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2" data-testid="landing-mode-chip-row">
          <Chip variant="neutral" title={modePresentation.tooltip}>{modePresentation.label}</Chip>
          <Chip className="text-cyan-100">Fast add · {fastAddState}</Chip>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.85fr)_minmax(320px,1fr)] lg:items-start">
          <div>
            <SectionTitle className="mb-2">Tonight&apos;s Board</SectionTitle>
            {marketClosed ? (
              <Panel className="mb-2 p-2.5" data-testid="market-closed-compact">
                <p className="text-xs text-white/70">Markets are currently quiet. {today.status === 'next' && today.nextAvailableStartTime ? `Next start: ${new Date(today.nextAvailableStartTime).toLocaleString()}` : 'No upcoming slates posted yet.'}</p>
              </Panel>
            ) : null}
            <div className="space-y-2" data-testid="board-section">
              {loading ? <p className="text-xs text-slate-400">Loading board…</p> : null}
              {!loading && board.length === 0 && !marketClosed ? <p className="text-xs text-slate-400">No active props in this window.</p> : null}
              {board.slice(0, 4).map((prop) => (
                <SlipRow
                  key={prop.id}
                  leftPrimary={`${prop.player} • ${prop.market.toUpperCase()} ${prop.line}`}
                  leftSecondary={`${gameById.get(prop.gameId)?.matchup ?? prop.gameId} · ${prop.odds}`}
                  right={(
                    <button type="button" onClick={() => toggleLeg(prop, gameById.get(prop.gameId)?.matchup)} className="rounded-lg border border-cyan-300/50 px-2 py-1 text-xs text-cyan-100">
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
            <Panel className={`transition ${slipPulse ? 'scale-[1.01] border-cyan-300/60' : ''}`} data-testid="landing-slip-mini">
              <PanelHeader
                title="Slip / Decision"
                action={<p className="text-xs text-cyan-100">Lead-first board</p>}
                subtitle={fastAddState}
              />
              <div className="space-y-1.5">
                {slip.length === 0 ? <p className="text-xs text-white/60">Add 2–3 leads to build a research-first draft.</p> : null}
                {slip.map((leg) => {
                  const confidence = leg.odds?.startsWith('-') ? 62 : 54;
                  return (
                    <SlipRow
                      key={leg.id}
                      leftPrimary={`${leg.player} • ${leg.line} ${leg.marketType.toUpperCase()}`}
                      leftSecondary={leg.game ?? 'Game not specified'}
                      right={<MicroBar value={confidence} />}
                    />
                  );
                })}
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {warnings.weakestLeg ? <Chip variant="warn">Fragile: {warnings.weakestLeg} (miss risk)</Chip> : null}
                {warnings.highCorrelation ? <Chip variant="warn">Correlation cluster: 3 legs</Chip> : null}
                {warnings.overstacked ? <Chip variant="warn">Overstack: 2 ceiling legs</Chip> : null}
              </div>

              <Divider className="my-2" />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={onAnalyze} className="rounded-xl border border-cyan-300/60 bg-cyan-400 px-3 py-1.5 text-sm font-semibold text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40">Build from Board</button>
                <Link href={sampleSlipHref} className="rounded-xl border border-white/20 px-3 py-1.5 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40">Try sample slip</Link>
                {latestRunHref ? <Link href={latestRunHref} className="self-center text-xs text-cyan-100 underline underline-offset-2">Open latest run</Link> : null}
              </div>
            </Panel>

            <Panel data-testid="landing-run-tracker" className="py-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Status · trace_id {activeTraceId.slice(0, 12)}</p>
              <div className="mt-2 flex items-center gap-1.5">
                {trackerSteps.map((step, index) => {
                  const isActive = runStage === step.id;
                  return (
                    <React.Fragment key={step.id}>
                      <div
                        data-testid={`run-stage-${step.id}`}
                        className={`rounded-full border px-2 py-0.5 text-[10px] ${isActive ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100' : 'border-white/10 text-white/50'}`}
                      >
                        <span className="mr-1">{step.done ? '✓' : '•'}</span>{step.label}
                      </div>
                      {index < trackerSteps.length - 1 ? <div className="h-px flex-1 bg-white/10" aria-hidden="true" /> : null}
                    </React.Fragment>
                  );
                })}
              </div>
            </Panel>
          </aside>
        </div>

        <div className="lg:hidden sticky bottom-2 z-20 mt-3">
          <button type="button" onClick={onAnalyze} className="w-full rounded-xl border border-cyan-300/50 bg-slate-900/95 px-4 py-2 text-sm font-semibold text-cyan-100 shadow-[0_8px_28px_rgba(2,6,23,0.5)]">
            Slip ({slip.length}) • Build from Board
          </button>
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
