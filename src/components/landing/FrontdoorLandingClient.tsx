'use client';

import React from 'react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { TodayPayloadSchema } from '@/src/core/contracts/envelopes';
import { parseTodayEnvelope } from '@/src/core/today/todayApiAdapter';
import { ModeBadge } from '@/src/components/landing/ModeBadge';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';

type TodayPayload = typeof TodayPayloadSchema._type;
type BoardProp = TodayPayload['board'][number] & {
  hitRateL10?: number;
  riskTag?: string;
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
    hitRateL10: 56 + (index % 4) * 4,
    riskTag: index % 3 === 0 ? 'watch' : 'stable'
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

const modeLabel = (mode: TodayPayload['mode']) => {
  if (mode === 'demo') return 'Demo mode (live feeds off)';
  if (mode === 'cache') return 'Live mode (some feeds unavailable)';
  return 'Live feeds on';
};

export function FrontdoorLandingClient() {
  const nervous = useNervousSystem();
  const { slip, addLeg, removeLeg } = useDraftSlip();
  const [today, setToday] = useState<TodayPayload>(FALLBACK_TODAY);
  const [loading, setLoading] = useState(true);
  const [traceId, setTraceId] = useState<string | undefined>(nervous.trace_id);

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
  const activeTraceId = traceId ?? nervous.trace_id;
  const spineHref = (path: string, extras?: Record<string, string | number | undefined>) => nervous.toHref(path, { trace_id: activeTraceId, ...(extras ?? {}) });
  const board = today.board.slice(0, 6) as BoardProp[];

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6" aria-label="frontdoor-terminal">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">ResearchBets <span className="ml-1 inline-block h-2 w-2 rounded-full bg-emerald-400 align-middle" /></p>
          <p className="mt-1 text-xs text-slate-300">{nervous.sport} · {nervous.date} · {nervous.tz}</p>
        </div>
        <div className="flex items-center gap-2">
          <ModeBadge mode={today.mode} reason={today.reason} />
          <span className="text-xs text-slate-300">{modeLabel(today.mode)}</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-300">Build from live board context and move legs into your slip instantly.</p>
            <Link href={spineHref('/today')} className="text-xs text-cyan-300 hover:text-cyan-200">Open full board</Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {loading
              ? Array.from({ length: 6 }, (_, i) => (
                  <div key={`sk-${i}`} className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
                    <div className="mb-2 h-4 w-2/3 rounded bg-white/10" />
                    <div className="mb-4 h-3 w-1/2 rounded bg-white/10" />
                    <div className="mb-2 h-3 w-4/5 rounded bg-white/10" />
                    <div className="h-8 rounded bg-white/10" />
                  </div>
                ))
              : board.map((prop) => {
                  const game = today.games.find((item) => item.id === prop.gameId);
                  const inSlip = slipIds.has(prop.id);
                  return (
                    <article key={prop.id} className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
                      <Link href={spineHref('/slip', { gameId: prop.gameId })} className="block">
                        <p className="text-sm font-medium">{game?.matchup ?? 'Featured matchup'}</p>
                        <p className="text-xs text-slate-400">{game?.startTime ?? 'Tonight'}</p>
                      </Link>
                      <div className="mt-3 space-y-1 text-sm">
                        <p className="font-medium">{prop.player} · {prop.market} {prop.line}</p>
                        <p className="text-slate-300">Odds {prop.odds} · L10 {prop.hitRateL10 ?? 58}% · {prop.riskTag ?? 'watch'}</p>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (inSlip) {
                              removeLeg(prop.id);
                              return;
                            }
                            addLeg({
                              id: prop.id,
                              player: prop.player,
                              marketType: toSlipMarketType(prop.market),
                              line: prop.line,
                              odds: prop.odds,
                              game: game?.matchup
                            });
                          }}
                          className="rounded-md border border-white/20 px-3 py-2 text-xs hover:bg-white/10"
                        >
                          {inSlip ? 'Remove leg' : 'Add leg'}
                        </button>
                        <Link
                          href={appendQuery(spineHref('/game/' + prop.gameId, { gameId: prop.gameId, propId: prop.id }), {
                            focus: 'research'
                          })}
                          className="rounded-md border border-cyan-400/60 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-500/10"
                        >
                          Open game
                        </Link>
                      </div>
                    </article>
                  );
                })}
          </div>
        </div>

        <aside className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
          <h3 className="text-sm font-semibold">Slip rail</h3>
          {slip.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">No legs yet. Add 2–3 legs from the board to run a quick stress test.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-xs text-slate-200">
              {slip.map((leg) => (
                <li key={leg.id} className="rounded-md border border-white/10 px-2 py-2">
                  {leg.player} · {leg.marketType} {leg.line}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 rounded-md border border-white/10 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
            <p>Slip intel</p>
            <p className="mt-1">Legs: {slip.length} · Correlation watch: {slip.length >= 2 ? 'On' : 'Low'} · Fragility: {slip.length >= 4 ? 'High' : 'Moderate'}</p>
          </div>
          <Link
            href={appendQuery(spineHref('/stress-test'), { source: 'frontdoor' })}
            className={`mt-4 block rounded-md px-3 py-2 text-center text-sm font-semibold transition ${slip.length > 0 ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300' : 'cursor-not-allowed border border-white/15 text-slate-500'}`}
            aria-disabled={slip.length === 0}
          >
            Stress test this slip →
          </Link>
        </aside>
      </div>
    </section>
  );
}
