'use client';

import React from 'react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { TodayPayloadSchema } from '@/src/core/contracts/envelopes';
import { deriveRuntimeModeBadgeLabel } from '@/src/core/env/runtime.shared';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';

type TodayPayload = typeof TodayPayloadSchema._type;
type BoardProp = TodayPayload['board'][number] & {
  hitRateL10?: number;
  riskTag?: string;
};

type TodayApiResult = {
  ok?: boolean;
  data?: unknown;
  trace_id?: string;
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
  const envelope = input as TodayApiResult;
  const candidate = (envelope.data ?? input) as unknown;
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

        const payload = response.ok ? ((await response.json()) as TodayApiResult) : null;
        const normalized = normalizeTodayResult(payload);
        setToday(normalized);
        if (payload?.trace_id) setTraceId(payload.trace_id);
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
  const hasPartialFeeds = today.mode === 'cache' || (today.mode === 'live' && (today.reason === 'missing_keys' || today.reason === 'provider_unavailable'));
  const modeLabel = deriveRuntimeModeBadgeLabel({ mode: today.mode, hasPartialFeeds });
  const board = today.board.slice(0, 6) as BoardProp[];

  const openLatestHref = traceId
    ? appendQuery(nervous.toHref('/traces'), { trace_id: traceId })
    : nervous.toHref('/slip');

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">ResearchBets</p>
            <h1 className="text-2xl font-semibold">Tonight&apos;s Board</h1>
          </div>
          <span className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">{modeLabel}</span>
        </div>
      </header>

      <section className="mx-auto flex max-w-6xl flex-wrap gap-2 px-4 py-4 sm:px-6">
        <Link href={appendQuery(nervous.toHref('/slip'), { sample: '1' })} className="rounded-md border border-white/10 px-3 py-2 text-sm hover:bg-white/5">
          Try sample slip
        </Link>
        <a href="#tonights-board" className="rounded-md border border-white/10 px-3 py-2 text-sm hover:bg-white/5">
          Build from Board
        </a>
        <Link href={openLatestHref} className="rounded-md border border-white/10 px-3 py-2 text-sm hover:bg-white/5">
          {traceId ? 'Open latest run' : 'Open latest run (start from slip)'}
        </Link>
      </section>

      <section id="tonights-board" className="mx-auto max-w-6xl px-4 pb-10 sm:px-6" aria-label="tonights-board">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-slate-300">Preview up to 6 scout cards with direct game and research actions.</p>
          <Link href={nervous.toHref('/landing')} className="text-xs text-slate-400 underline-offset-4 hover:underline">Marketing page</Link>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }, (_, i) => (
                <div key={`sk-${i}`} className="animate-pulse rounded-xl border border-white/10 bg-slate-900/70 p-4">
                  <div className="mb-2 h-4 w-2/3 rounded bg-white/10" />
                  <div className="mb-4 h-3 w-1/2 rounded bg-white/10" />
                  <div className="h-9 rounded bg-white/10" />
                </div>
              ))
            : board.map((prop) => {
                const game = today.games.find((item) => item.id === prop.gameId);
                const inSlip = slipIds.has(prop.id);
                return (
                  <article key={prop.id} className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
                    <Link href={nervous.toHref(`/game/${prop.gameId}`, { gameId: prop.gameId })} className="block">
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
                        {inSlip ? 'Remove from slip' : 'Add to slip'}
                      </button>
                      <Link
                        href={appendQuery(nervous.toHref('/slip', { gameId: prop.gameId, propId: prop.id, trace_id: traceId }), {
                          focus: 'research'
                        })}
                        className="rounded-md bg-cyan-400 px-3 py-2 text-xs font-medium text-slate-900"
                      >
                        Run research
                      </Link>
                    </div>
                  </article>
                );
              })}
        </div>
      </section>
    </main>
  );
}
