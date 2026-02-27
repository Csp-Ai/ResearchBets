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

type TodayPayload = typeof TodayPayloadSchema._type;
type BoardProp = TodayPayload['board'][number] & { hitRateL10?: number; hitRateL5?: number; confidencePct?: number; riskTag?: string };

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
  const [openInsightRow, setOpenInsightRow] = useState<string | null>(null);

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
  const board = today.board.slice(0, 6) as BoardProp[];

  const toggleLeg = useCallback((prop: BoardProp, matchup?: string) => {
    if (slipIds.has(prop.id)) return removeLeg(prop.id);
    addLeg({ id: prop.id, player: prop.player, marketType: toSlipMarketType(prop.market), line: prop.line, odds: prop.odds, game: matchup });
  }, [addLeg, removeLeg, slipIds]);

  const grouped = useMemo(() => {
    const map = new Map<string, BoardProp[]>();
    board.forEach((prop) => map.set(prop.gameId, [...(map.get(prop.gameId) ?? []), prop]));
    return Array.from(map.entries()).map(([gameId, props]) => ({ gameId, props, game: gameById.get(gameId) }));
  }, [board, gameById]);

  const marketClosed = today.status === 'market_closed';

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-10" style={{ minHeight: 760 }}>
      <LandingTerminalShell
        mode={today.mode}
        reason={today.reason}
        title="Tonight's Board"
        subtitle={today.status === 'next' && today.nextAvailableStartTime ? `Next slate begins at ${new Date(today.nextAvailableStartTime).toLocaleString()}` : 'Scan edges, build a slip, then stress test before lock.'}
        statusSlot={<FeedStatusChip health={(today.providerHealth as Array<{ provider: string; ok: boolean; message?: string; missingKey?: boolean }> | undefined)} />}
      >
        {marketClosed ? (
          <div className="mb-4 rounded-xl border border-white/10 bg-slate-950/70 p-4">
            <h3 className="text-lg font-semibold text-slate-100">Markets closed.</h3>
            <p className="mt-1 text-sm text-slate-300">No upcoming slates posted.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={spineHref('/stress-test', { source: 'upload_last_slip' })} className="rounded border border-cyan-300/60 px-3 py-1.5 text-sm text-cyan-100">Upload last slip →</Link>
              <Link href={spineHref('/today', { sport: nervous.sport === 'NBA' ? 'NFL' : 'NBA' })} className="rounded border border-white/20 px-3 py-1.5 text-sm text-slate-100">Switch sport →</Link>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]" data-testid="landing-terminal-grid">
          <div className="space-y-3">
            {loading ? <p className="text-sm text-slate-400">Loading live board…</p> : null}
            {grouped.length === 0 && !marketClosed ? <p className="text-sm text-slate-400">Live mode (some feeds unavailable)</p> : null}
            {grouped.map(({ gameId, props, game }) => (
              <article key={gameId} className="rounded-xl border border-white/10 bg-slate-950/70 p-2.5">
                <p className="text-sm font-medium text-slate-100">{game?.matchup ?? gameId}</p>
                <p className="text-xs text-slate-400">{game?.startTime ?? 'Upcoming'}</p>
                <div className="mt-1.5 divide-y divide-white/10 rounded-md border border-white/10 bg-slate-950/60" data-testid="terminal-prop-rows">
                  {props.map((prop) => {
                    const inSlip = slipIds.has(prop.id);
                    return (
                      <div key={prop.id} className="compact-prop-row grid min-h-9 grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto_auto_auto] items-center gap-2 px-2 py-1 text-[11px]">
                        <span className="truncate font-medium text-slate-100" title={prop.player}>{prop.player}</span>
                        <span className="truncate font-mono text-slate-300">{prop.market} {prop.line}</span>
                        <span className="rounded-full border border-cyan-300/30 px-1.5 py-0.5 text-[10px] text-cyan-100">L10 {prop.hitRateL10 ?? 0}%</span>
                        <span className="font-mono text-slate-300">{prop.odds}</span>
                        <button type="button" onClick={() => setOpenInsightRow((current) => (current === prop.id ? null : prop.id))} className="h-5 min-w-5 rounded border border-white/20 px-1 text-[10px]">Why</button>
                        <button type="button" onClick={() => toggleLeg(prop, game?.matchup)} aria-label={`${inSlip ? 'Remove' : 'Add'} ${prop.player} ${prop.market} ${prop.line} ${inSlip ? 'from' : 'to'} slip`} className="h-5 min-w-5 rounded border border-white/20 px-1 text-[10px] text-cyan-100">{inSlip ? '−' : '+'}</button>
                        {openInsightRow === prop.id ? <div className="col-span-full rounded border border-cyan-300/20 bg-slate-900/80 px-2 py-1 text-[10px] text-slate-200">L5 {prop.hitRateL5 ?? '—'} · L10 {prop.hitRateL10 ?? '—'} · Volatility {String(prop.riskTag ?? 'watch')} · Confidence {prop.confidencePct ?? '—'} · Odds {prop.odds}</div> : null}
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start" data-testid="slip-rail-desktop">
            <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
              <h3 className="text-sm font-semibold">Slip rail</h3>
              {slip.length === 0 ? <p className="mt-2 text-sm text-slate-400">No legs yet. Add live legs from the board.</p> : <ul className="mt-2 space-y-1 text-xs text-slate-200">{slip.map((leg) => <li key={leg.id} className="rounded-md border border-white/10 px-2 py-1.5">{leg.player} · {leg.marketType} {leg.line}</li>)}</ul>}
              <Link href={appendQuery(spineHref('/stress-test'), { source: 'frontdoor' })} className={`mt-3 block rounded-md px-3 py-2 text-center text-sm font-semibold ${slip.length > 0 ? 'border border-cyan-300/60 bg-cyan-400 text-slate-950' : 'cursor-not-allowed border border-white/15 text-slate-500'}`}>{slip.length > 0 ? 'Stress test this slip →' : 'Start by adding legs →'}</Link>
            </div>
          </aside>
        </div>
      </LandingTerminalShell>
      <div className={`mt-4 ${marketClosed ? '' : 'opacity-90'}`}>
        <PostmortemUploadWedge />
      </div>
    </section>
  );
}
