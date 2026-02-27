'use client';

import React from 'react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { appendQuery } from '@/src/components/landing/navigation';
import { LandingTerminalShell } from '@/src/components/landing/LandingTerminalShell';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { TodayPayloadSchema } from '@/src/core/contracts/envelopes';
import { parseTodayEnvelope } from '@/src/core/today/todayApiAdapter';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';
import { FeedStatusChip } from '@/src/components/landing/FeedStatusChip';
import { PostmortemUploadWedge } from '@/src/components/landing/PostmortemUploadWedge';
import { deriveScoutCards } from '@/src/core/scout/deriveScoutCards';
import { ScoutCardsPanel } from '@/src/components/landing/ScoutCardsPanel';
import { ExpandableGamePanel } from '@/src/components/landing/ExpandableGamePanel';

type TodayPayload = typeof TodayPayloadSchema._type;
type BoardProp = TodayPayload['board'][number] & { hitRateL10?: number; hitRateL5?: number; confidencePct?: number; riskTag?: string };
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
  const nervous = useNervousSystem();
  const { slip, addLeg, removeLeg } = useDraftSlip();
  const [today, setToday] = useState<TodayPayload>(EMPTY_TODAY);
  const [loading, setLoading] = useState(true);
  const [traceId, setTraceId] = useState<string | undefined>(nervous.trace_id);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      const href = appendQuery('/api/today', { sport: nervous.sport, tz: nervous.tz, date: nervous.date, trace_id: nervous.trace_id });
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
  }, [nervous.date, nervous.sport, nervous.tz, nervous.trace_id]);

  const slipIds = useMemo(() => new Set(slip.map((leg) => leg.id)), [slip]);
  const gameById = useMemo(() => new Map(today.games.map((game) => [game.id, game])), [today.games]);
  const activeTraceId = traceId ?? nervous.trace_id;
  const spineHref = useCallback((path: string, extras?: Record<string, string | number | undefined>) => nervous.toHref(path, { trace_id: activeTraceId, ...(extras ?? {}) }), [activeTraceId, nervous]);
  const buildHref = useCallback((path: '/today' | '/stress-test' | '/postmortem', query?: Record<string, string | number | undefined>) => appendQuery(spineHref(path), query ?? {}), [spineHref]);
  const board = today.board.slice(0, 8) as BoardProp[];

  const toggleLeg = useCallback((prop: SlipToggleProp, matchup?: string) => {
    if (slipIds.has(prop.id)) return removeLeg(prop.id);
    addLeg({ id: prop.id, player: prop.player, marketType: toSlipMarketType(prop.market), line: prop.line, odds: prop.odds, game: matchup });
  }, [addLeg, removeLeg, slipIds]);

  const grouped = useMemo(() => {
    const map = new Map<string, BoardProp[]>();
    board.forEach((prop) => map.set(prop.gameId, [...(map.get(prop.gameId) ?? []), prop]));
    return Array.from(map.entries()).map(([gameId, props]) => ({ gameId, props, game: gameById.get(gameId) }));
  }, [board, gameById]);

  const marketClosed = today.status === 'market_closed';
  const { cards: scoutCards, topSignal } = useMemo(() => deriveScoutCards(today), [today]);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-8" style={{ minHeight: 760 }}>
      <LandingTerminalShell
        mode={today.mode}
        reason={today.reason}
        title="Tonight's Board"
        subtitle={today.status === 'next' && today.nextAvailableStartTime ? `Next slate begins at ${new Date(today.nextAvailableStartTime).toLocaleString()}` : 'Live board and stress-test loop.'}
        statusSlot={<FeedStatusChip health={(today.providerHealth as Array<{ provider: string; ok: boolean; message?: string; missingKey?: boolean }> | undefined)} />}
      >
        {topSignal ? <p className="mb-2 text-xs text-slate-300" data-testid="top-signal-line">Top signals now: {topSignal}</p> : null}
        <ScoutCardsPanel cards={scoutCards} buildHref={buildHref} />

        {marketClosed ? (
          <div className="mt-2 rounded-lg border border-white/10 bg-slate-950/70 p-2" data-testid="market-closed-compact">
            <p className="text-sm font-semibold text-slate-100">Markets closed.</p>
            <p className="text-xs text-slate-400">{today.status === 'next' && today.nextAvailableStartTime ? `Next start: ${new Date(today.nextAvailableStartTime).toLocaleString()}` : 'No upcoming slates posted.'}</p>
          </div>
        ) : null}

        <div className="mt-2 grid gap-3 lg:grid-cols-[2fr_1fr]" data-testid="landing-terminal-grid">
          <div className="space-y-2" data-testid="board-section">
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
            {slip.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/20 bg-slate-950/50 p-2 text-xs text-slate-300" data-testid="slip-inline-prompt">
                Add 2–3 legs to run a quick stress test.
                <Link href={appendQuery(spineHref('/stress-test'), { source: 'frontdoor_inline_prompt' })} className="ml-2 rounded border border-cyan-300/40 px-1.5 py-0.5 text-cyan-100">Open stress-test →</Link>
              </div>
            ) : null}
          </div>

          {slip.length > 0 ? (
            <aside className="lg:sticky lg:top-4 lg:self-start" data-testid="slip-rail-desktop">
              <div className="rounded-lg border border-white/10 bg-slate-950/70 p-2">
                <h3 className="text-sm font-semibold">Slip rail</h3>
                <ul className="mt-1.5 space-y-1 text-xs text-slate-200">{slip.map((leg) => <li key={leg.id} className="rounded border border-white/10 px-2 py-1">{leg.player} · {leg.marketType} {leg.line}</li>)}</ul>
                <Link href={appendQuery(spineHref('/stress-test'), { source: 'frontdoor' })} className="mt-2 block rounded border border-cyan-300/60 bg-cyan-400 px-3 py-1.5 text-center text-sm font-semibold text-slate-950">Stress test this slip →</Link>
              </div>
            </aside>
          ) : null}
        </div>
      </LandingTerminalShell>
      <div className="mt-3" data-testid="postmortem-wedge-wrap">
        <PostmortemUploadWedge />
      </div>
    </section>
  );
}
