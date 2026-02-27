'use client';

import React from 'react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { appendQuery } from '@/src/components/landing/navigation';
import { LandingTerminalShell } from '@/src/components/landing/LandingTerminalShell';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { EventEnvelopeSchema, TodayPayloadSchema } from '@/src/core/contracts/envelopes';
import { parseTodayEnvelope } from '@/src/core/today/todayApiAdapter';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';
import { FeedStatusChip } from '@/src/components/landing/FeedStatusChip';
import { ExpandableGamePanel } from '@/src/components/landing/ExpandableGamePanel';
import { computeInlineSlipWarnings, getLatestTraceId } from '@/src/core/run/store';
import { withTraceId } from '@/src/core/trace/queryTrace';

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

const americanToDecimal = (odds?: string): number => {
  if (!odds) return 2;
  const value = Number.parseInt(odds, 10);
  if (!Number.isFinite(value) || value === 0) return 2;
  if (value > 0) return 1 + (value / 100);
  return 1 + (100 / Math.abs(value));
};

export function FrontdoorLandingClient() {
  const router = useRouter();
  const nervous = useNervousSystem();
  const { slip, addLeg, removeLeg } = useDraftSlip();
  const [today, setToday] = useState<TodayPayload>(EMPTY_TODAY);
  const [loading, setLoading] = useState(true);
  const [traceId, setTraceId] = useState<string>(() => nervous.trace_id ?? crypto.randomUUID());
  const [latestTraceId, setLatestTraceId] = useState<string | null>(null);
  const [slipText, setSlipText] = useState('Jayson Tatum over 29.5 points (-110)\nLuka Doncic over 8.5 assists (-120)');
  const [runStage, setRunStage] = useState<'before' | 'during' | 'after'>('before');
  const [slipPulse, setSlipPulse] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      const activeTraceId = traceId;
      const href = appendQuery('/api/today', { sport: nervous.sport, tz: nervous.tz, date: nervous.date, trace_id: activeTraceId });
      try {
        const response = await fetch(href, { cache: 'no-store', signal: controller.signal });
        const payload = response.ok ? await response.json() : null;
        const normalized = normalizeTodayResult(payload);
        setToday(normalized);
        const parsedEnvelope = parseTodayEnvelope(payload);
        if (parsedEnvelope.success && parsedEnvelope.data.ok) setTraceId(parsedEnvelope.data.trace_id);
      } catch {
        setToday(EMPTY_TODAY);
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [nervous.date, nervous.sport, nervous.tz, traceId]);

  useEffect(() => {
    setLatestTraceId(getLatestTraceId());
  }, []);

  useEffect(() => {
    if (runStage !== 'during') return;
    const activeTraceId = traceId;
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
  }, [runStage, today.mode, traceId]);

  const slipIds = useMemo(() => new Set(slip.map((leg) => leg.id)), [slip]);
  const gameById = useMemo(() => new Map(today.games.map((game) => [game.id, game])), [today.games]);
  const activeTraceId = traceId;
  const spineHref = useCallback((path: string, extras?: Record<string, string | number | undefined>) => nervous.toHref(path, { trace_id: activeTraceId, ...(extras ?? {}) }), [activeTraceId, nervous]);
  const board = today.board.slice(0, 10) as BoardProp[];

  const toggleLeg = useCallback((prop: SlipToggleProp, matchup?: string) => {
    if (slipIds.has(prop.id)) return removeLeg(prop.id);
    addLeg({ id: prop.id, player: prop.player, marketType: toSlipMarketType(prop.market), line: prop.line, odds: prop.odds, game: matchup });
    setRunStage('before');
    setSlipPulse(true);
    window.setTimeout(() => setSlipPulse(false), 260);
  }, [addLeg, removeLeg, slipIds]);

  const grouped = useMemo(() => {
    const map = new Map<string, BoardProp[]>();
    board.forEach((prop) => map.set(prop.gameId, [...(map.get(prop.gameId) ?? []), prop]));
    return Array.from(map.entries()).map(([gameId, props]) => ({ gameId, props, game: gameById.get(gameId) }));
  }, [board, gameById]);

  const marketClosed = today.status === 'market_closed';
  const modeChip = today.mode === 'demo' ? 'Demo mode (live feeds off)' : 'Live feeds on';

  const sampleSlipHref = appendQuery(withTraceId(nervous.toHref('/stress-test'), activeTraceId), { source: 'landing_sample_slip', prefill: slipText });
  const latestRunHref = latestTraceId ? withTraceId(nervous.toHref('/research'), latestTraceId) : null;

  const onAnalyze = useCallback(() => {
    setRunStage('during');
    router.push(sampleSlipHref);
  }, [router, sampleSlipHref]);

  const warnings = useMemo(() => computeInlineSlipWarnings(slip), [slip]);
  const payoutX = useMemo(() => {
    if (slip.length === 0) return 1;
    return slip.reduce((acc, leg) => acc * americanToDecimal(leg.odds), 1);
  }, [slip]);
  const fastAddState = slip.length >= 4 ? 'SGP cluster mode' : slip.length >= 2 ? '2-leg parlay ready' : 'Tap props for 1-click add';

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-8" style={{ minHeight: 760 }}>
      <LandingTerminalShell
        mode={today.mode}
        reason={today.reason}
        title="Value-Oriented Board"
        subtitle={today.status === 'next' && today.nextAvailableStartTime ? `Next slate begins at ${new Date(today.nextAvailableStartTime).toLocaleString()}` : 'Fast scan tonight. Stack props. Check your edge.'}
        statusSlot={<FeedStatusChip health={(today.providerHealth as Array<{ provider: string; ok: boolean; message?: string; missingKey?: boolean }> | undefined)} />}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2" data-testid="landing-mode-chip-row">
          <span className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-slate-100">{modeChip}</span>
          <span className="rounded-full border border-cyan-300/30 px-2 py-1 text-[11px] text-cyan-100">Fast add mode · {fastAddState}</span>
        </div>

        {marketClosed ? (
          <div className="mt-2 rounded-lg border border-white/10 bg-slate-950/70 p-2" data-testid="market-closed-compact">
            <p className="text-sm font-semibold text-slate-100">Markets closed.</p>
            <p className="text-xs text-slate-400">{today.status === 'next' && today.nextAvailableStartTime ? `Next start: ${new Date(today.nextAvailableStartTime).toLocaleString()}` : 'No upcoming slates posted.'}</p>
          </div>
        ) : null}

        <div className="mt-2 space-y-2" data-testid="board-section">
          {loading ? <p className="text-xs text-slate-400">Loading live board…</p> : null}
          {grouped.length === 0 && !marketClosed ? <p className="text-xs text-slate-400">Live feeds returned no active props for this spine.</p> : null}
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

        <div className={`mt-3 grid gap-2 rounded-lg border border-white/10 bg-slate-950/70 p-3 transition ${slipPulse ? 'scale-[1.01] border-cyan-300/60' : ''}`} data-testid="landing-slip-mini">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-100">Slip mini</p>
            <p className="text-xs text-cyan-100">Projected payout x{payoutX.toFixed(2)}</p>
          </div>
          <p className="text-[11px] text-slate-400">{fastAddState}</p>
          {warnings.weakestLeg ? <p className="text-xs text-amber-100">⚠️ Most fragile leg: {warnings.weakestLeg}</p> : null}
          {warnings.highCorrelation ? <p className="text-xs text-amber-100">⚠️ High correlation cluster</p> : null}
          {warnings.overstacked ? <p className="text-xs text-amber-100">⚠️ Overstack warning: too many same-game heavy legs</p> : null}
          <textarea value={slipText} onChange={(event) => setSlipText(event.target.value)} className="h-20 w-full rounded-md border border-white/15 bg-slate-950/80 p-2 text-xs text-slate-100" aria-label="Slip text" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onAnalyze} className="rounded-md border border-cyan-300/60 bg-cyan-400 px-3 py-1.5 text-sm font-semibold text-slate-950">Check my edge</button>
            <Link href={sampleSlipHref} className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-slate-100">Send it anyway</Link>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/70 p-3" data-testid="landing-run-tracker" data-trace-id={activeTraceId}>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Run tracker · trace_id {activeTraceId.slice(0, 12)}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span data-testid="run-stage-before" className={`rounded-full border px-2 py-1 ${runStage === 'before' ? 'border-cyan-300/50 text-cyan-100' : 'border-white/15 text-slate-300'}`}>BEFORE · Slip ready / Board loaded</span>
            <span data-testid="run-stage-during" className={`rounded-full border px-2 py-1 ${runStage === 'during' ? 'border-amber-300/50 text-amber-100' : 'border-white/15 text-slate-300'}`}>DURING · Analyzing...</span>
            <span data-testid="run-stage-after" className={`rounded-full border px-2 py-1 ${runStage === 'after' ? 'border-emerald-300/50 text-emerald-100' : 'border-white/15 text-slate-300'}`}>AFTER · Verdict ready</span>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/70 p-3" data-testid="landing-edu-strip">
          <p className="text-xs text-slate-300">Educational strip: Correlation can quietly reduce parlay hit-rate. Use warnings above to rebalance before you run analysis.</p>
          <div className="mt-2 flex flex-wrap gap-2" data-testid="continuity-ctas-row">
            <Link href={sampleSlipHref} className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-slate-100">Try sample slip</Link>
            {latestRunHref ? <Link href={latestRunHref} className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-slate-100">Open latest run</Link> : null}
          </div>
        </div>
      </LandingTerminalShell>
    </section>
  );
}
