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

type TodayPayload = typeof TodayPayloadSchema._type;
type BoardProp = TodayPayload['board'][number] & {
  hitRateL10?: number;
};

const FALLBACK_TODAY: TodayPayload = {
  mode: 'demo',
  reason: 'deterministic_preview',
  games: Array.from({ length: 3 }, (_, index) => ({
    id: `demo-game-${index + 1}`,
    matchup: ['NYK @ IND', 'LAL @ DEN', 'BOS @ MIA'][index] ?? `Matchup ${index + 1}`,
    startTime: ['7:00 PM', '8:30 PM', '9:00 PM'][index] ?? `${7 + index}:00 PM`
  })),
  board: Array.from({ length: 6 }, (_, index) => ({
    id: `demo-prop-${index + 1}`,
    gameId: `demo-game-${(index % 3) + 1}`,
    player: `Demo Player ${index + 1}`,
    market: 'points',
    line: '20.5',
    odds: '-110',
    hitRateL10: 56 + (index % 4) * 4
  }))
};

const toSlipMarketType = (market: string) => {
  const normalized = market.toLowerCase();
  if (normalized === 'total' || normalized === 'spread' || normalized === 'moneyline' || normalized === 'points' || normalized === 'threes' || normalized === 'rebounds' || normalized === 'assists' || normalized === 'ra' || normalized === 'pra') {
    return normalized;
  }
  return 'points';
};

const normalizeTodayResult = (input: unknown): TodayPayload => {
  if (!input || typeof input !== 'object') return FALLBACK_TODAY;
  const parsedEnvelope = parseTodayEnvelope(input);
  const candidate = parsedEnvelope.success && parsedEnvelope.data.ok ? parsedEnvelope.data.data : input;
  const parsed = TodayPayloadSchema.safeParse(candidate);
  if (!parsed.success) return FALLBACK_TODAY;
  if (parsed.data.board.length >= 6) return parsed.data;

  return {
    ...parsed.data,
    board: [...parsed.data.board, ...FALLBACK_TODAY.board].slice(0, 6)
  };
};

export function FrontdoorLandingClient() {
  const nervous = useNervousSystem();
  const { slip, addLeg, removeLeg } = useDraftSlip();
  const [today, setToday] = useState<TodayPayload>(FALLBACK_TODAY);
  const [loading, setLoading] = useState(true);
  const [traceId, setTraceId] = useState<string | undefined>(nervous.trace_id);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const ssrNodes = Array.from(document.querySelectorAll('[data-landing-ssr]'));
    ssrNodes.forEach((node) => node.setAttribute('hidden', 'true'));
    return () => ssrNodes.forEach((node) => node.removeAttribute('hidden'));
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      const href = appendQuery('/api/today', {
        sport: nervous.sport,
        tz: nervous.tz,
        date: nervous.date,
        trace_id: nervous.trace_id
      });

      try {
        const response = await fetch(href, {
          headers: { 'x-live-mode': nervous.mode === 'live' ? '1' : '0' },
          cache: 'no-store',
          signal: controller.signal
        });

        const payload = response.ok ? await response.json() : null;
        const normalized = normalizeTodayResult(payload);
        setToday(normalized);
        const parsedEnvelope = parseTodayEnvelope(payload);
        if (parsedEnvelope.success && parsedEnvelope.data.ok) setTraceId(parsedEnvelope.data.trace_id);
      } catch {
        setToday(FALLBACK_TODAY);
      } finally {
        setLoading(false);
      }
    };

    void load();

    return () => controller.abort();
  }, [nervous.date, nervous.mode, nervous.sport, nervous.tz, nervous.trace_id]);

  const slipIds = useMemo(() => new Set(slip.map((leg) => leg.id)), [slip]);
  const gameById = useMemo(() => new Map(today.games.map((game) => [game.id, game])), [today.games]);
  const activeTraceId = traceId ?? nervous.trace_id;
  const spineHref = useCallback(
    (path: string, extras?: Record<string, string | number | undefined>) => nervous.toHref(path, { trace_id: activeTraceId, ...(extras ?? {}) }),
    [activeTraceId, nervous]
  );
  const board = today.board.slice(0, 6) as BoardProp[];
  const compactBoard = useMemo(() => {
    const grouped = new Map<string, BoardProp[]>();
    board.forEach((prop) => {
      grouped.set(prop.gameId, [...(grouped.get(prop.gameId) ?? []), prop]);
    });
    return Array.from(grouped.entries())
      .slice(0, 6)
      .map(([gameId, props]) => ({ gameId, props: props.slice(0, 3), game: gameById.get(gameId) }));
  }, [board, gameById]);

  const toggleLeg = useCallback(
    (prop: BoardProp, matchup?: string) => {
      if (slipIds.has(prop.id)) {
        removeLeg(prop.id);
        return;
      }
      addLeg({
        id: prop.id,
        player: prop.player,
        marketType: toSlipMarketType(prop.market),
        line: prop.line,
        odds: prop.odds,
        game: matchup
      });
    },
    [addLeg, removeLeg, slipIds]
  );

  const addSampleSlip = useCallback(() => {
    const sample = (board.length > 0 ? board : FALLBACK_TODAY.board).slice(0, 3);
    sample.forEach((prop) => {
      if (slipIds.has(prop.id)) return;
      const game = gameById.get(prop.gameId) ?? FALLBACK_TODAY.games.find((item) => item.id === prop.gameId);
      addLeg({
        id: prop.id,
        player: prop.player,
        marketType: toSlipMarketType(prop.market),
        line: prop.line,
        odds: prop.odds,
        game: game?.matchup
      });
    });
  }, [addLeg, board, gameById, slipIds]);

  return (
    <section aria-label="frontdoor-client" className={hydrated ? 'block' : 'hidden'}>
      <LandingTerminalShell mode={today.mode} reason={today.reason}>
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span>{loading ? 'Loading board…' : `${compactBoard.length} games · ${board.length} props`}</span>
              <Link href={spineHref('/today')} className="text-cyan-200 hover:text-cyan-100">Open full board</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {loading
                ? Array.from({ length: 6 }, (_, i) => (
                    <div key={`sk-${i}`} className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                      <div className="mb-2 h-4 w-2/3 rounded bg-white/10" />
                      <div className="mb-3 h-3 w-1/2 rounded bg-white/10" />
                      <div className="h-20 rounded bg-white/10" />
                    </div>
                  ))
                : compactBoard.map(({ gameId, props, game }) => (
                    <article key={gameId} className={`rounded-xl border bg-slate-950/70 p-3 ${props.some((prop) => slipIds.has(prop.id)) ? 'border-cyan-400/60' : 'border-white/10'}`}>
                      <Link href={spineHref('/slip', { gameId })} className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">
                        <p className="text-sm font-medium text-slate-100">{game?.matchup ?? 'Featured matchup'}</p>
                        <p className="text-xs text-slate-400">{game?.startTime ?? 'Tonight'}</p>
                      </Link>
                      <div className="mt-2 divide-y divide-white/10 rounded-md border border-white/10 bg-slate-950/60">
                        {props.map((prop) => {
                          const inSlip = slipIds.has(prop.id);
                          return (
                            <div key={prop.id} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_auto_auto] items-center gap-2 px-2 py-1 text-[11px]">
                              <span className="truncate font-medium" title={prop.player}>{prop.player}</span>
                              <span className="truncate text-slate-300">{prop.market} {prop.line}</span>
                              <span className="rounded-full border border-cyan-300/30 px-1.5 py-0.5 text-[10px] text-cyan-100">L10 {prop.hitRateL10 ?? 58}%</span>
                              <span className="text-slate-300">{prop.odds}</span>
                              <button
                                type="button"
                                onClick={() => toggleLeg(prop, game?.matchup)}
                                aria-label={`${inSlip ? 'Remove' : 'Add'} ${prop.player} ${prop.market} ${prop.line} ${inSlip ? 'from' : 'to'} slip`}
                                className="rounded border border-white/20 px-1.5 py-0.5 text-[10px] text-cyan-100 hover:border-cyan-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                              >
                                {inSlip ? '−' : '+'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  ))}
            </div>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
              <h3 className="text-sm font-semibold">Slip rail</h3>
              {slip.length === 0 ? (
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-slate-400">No legs yet. Add 2–3 legs from the board to run a quick stress test.</p>
                  <button
                    type="button"
                    onClick={addSampleSlip}
                    className="text-xs text-cyan-200 underline decoration-cyan-400/50 underline-offset-2 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                    aria-label="Try sample slip"
                  >
                    Try sample slip
                  </button>
                </div>
              ) : (
                <ul className="mt-2 space-y-1 text-xs text-slate-200">
                  {slip.map((leg) => (
                    <li key={leg.id} className="rounded-md border border-white/10 px-2 py-1.5">
                      {leg.player} · {leg.marketType} {leg.line}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 rounded-md border border-white/10 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
                <p>Slip intel</p>
                <p className="mt-1">Legs: {slip.length} · Correlation watch: {slip.length >= 2 ? 'On' : 'Low'} · Fragility: {slip.length >= 4 ? 'High' : 'Moderate'}</p>
              </div>
              <div className="mt-4 lg:sticky lg:bottom-0 lg:bg-slate-950/70 lg:pb-1">
                <Link
                  href={appendQuery(spineHref('/stress-test'), { source: 'frontdoor' })}
                  className={`block rounded-md px-3 py-2 text-center text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 ${slip.length > 0 ? 'border border-cyan-300/60 bg-cyan-400 text-slate-950 hover:bg-cyan-300' : 'cursor-not-allowed border border-white/15 text-slate-500'}`}
                  aria-disabled={slip.length === 0}
                  aria-label={slip.length > 0 ? 'Stress test this slip' : 'Start by adding legs'}
                >
                  {slip.length > 0 ? 'Stress test this slip →' : 'Start by adding legs →'}
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </LandingTerminalShell>
    </section>
  );
}
