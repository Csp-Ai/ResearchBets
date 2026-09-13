'use client';

import { useEffect, useMemo, useState } from 'react';

import { useDraftSlip } from '@/src/hooks/useDraftSlip';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import type { MarketType } from '@/src/core/markets/marketType';

type TodayIdea = {
  id: string;
  sport: 'NFL';
  eventId: string;
  matchup: string;
  commenceTime: string;
  player: string;
  marketType: MarketType;
  line: number;
  bestPrice: number;
  consensusPrice: number;
  marketImpliedProb: number;
  books: string[];
  sourceCount: number;
  structuralRisk: 'low' | 'medium' | 'high';
  readiness: 'market-verified' | 'needs-status-check';
  why: string[];
};

type IdeasResponse = {
  ok: boolean;
  data?: {
    mode: 'live-market' | 'unavailable';
    generatedAt: string;
    date: string;
    timeZone: string;
    sport: 'NFL';
    games: number;
    ideas: TodayIdea[];
    warnings: string[];
  };
};

const LABELS: Partial<Record<MarketType, string>> = {
  passing_yards: 'Passing yards',
  passing_tds: 'Passing TDs',
  rushing_yards: 'Rushing yards',
  receiving_yards: 'Receiving yards',
  receptions: 'Receptions',
  carries: 'Carries',
  anytime_td: 'Anytime TD',
};

const formatOdds = (odds: number) => (odds > 0 ? `+${odds}` : String(odds));

const milestone = (idea: TodayIdea) => {
  if (idea.marketType === 'anytime_td') return 'Anytime TD';
  const rounded = Number.isInteger(idea.line)
    ? idea.line
    : Math.abs(idea.line % 1) === 0.5
      ? Math.floor(idea.line) + 1
      : idea.line;
  return `${rounded}+ ${LABELS[idea.marketType] ?? idea.marketType}`;
};

const riskTone = (risk: TodayIdea['structuralRisk']) => {
  if (risk === 'low') return 'border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-100';
  if (risk === 'high') return 'border-amber-300/15 bg-amber-300/[0.06] text-amber-100';
  return 'border-sky-300/15 bg-sky-300/[0.05] text-sky-100';
};

export function TodayIdeasRail() {
  const nervous = useNervousSystem();
  const { slip, addLeg } = useDraftSlip();
  const [payload, setPayload] = useState<IdeasResponse['data']>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      sport: 'NFL',
      date: nervous.date,
      tz: nervous.tz,
    });

    setLoading(true);
    setFailed(false);
    fetch(`/api/ideas/today?${params.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json()) as IdeasResponse;
        if (!response.ok || !body.ok || !body.data) throw new Error('ideas_unavailable');
        setPayload(body.data);
      })
      .catch((error) => {
        if ((error as Error).name !== 'AbortError') setFailed(true);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [nervous.date, nervous.tz]);

  const slipIds = useMemo(() => new Set(slip.map((leg) => leg.id)), [slip]);
  const ideas = payload?.ideas ?? [];
  const topIdeas = ideas.slice(0, 8);

  const addIdea = (idea: TodayIdea) => {
    if (slipIds.has(idea.id)) return;
    addLeg({
      id: idea.id,
      player: idea.player,
      marketType: idea.marketType,
      line: milestone(idea),
      odds: formatOdds(idea.bestPrice),
      game: idea.matchup,
    });
  };

  if (!loading && (failed || payload?.mode === 'unavailable')) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-5" aria-label="Today's ideas status">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-sm text-slate-400">
          <span className="font-semibold text-slate-200">Today&apos;s Ideas</span>
          <span className="ml-2">Live market scan is temporarily unavailable. The research board is still available below.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-5" aria-label="Today's strongest parlay ideas">
      <div className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(51,106,255,0.13),transparent_34%),linear-gradient(180deg,rgba(12,17,27,0.96),rgba(6,9,14,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
        <div className="flex flex-col gap-4 border-b border-white/[0.07] px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.65)]" />
              Live research · NFL · {nervous.date}
            </div>
            <h2 className="text-[24px] font-semibold tracking-[-0.035em] text-white sm:text-[28px]">
              Today&apos;s strongest structures
            </h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-5 text-slate-400">
              Same-day player thresholds ranked from live multi-book prices and structural risk. Status verification is required before lock.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>{payload?.games ?? 0} games scanned</span>
            <span aria-hidden>·</span>
            <span>{ideas.length} candidates</span>
          </div>
        </div>

        {loading ? (
          <div className="flex gap-3 overflow-hidden px-4 py-4 sm:px-5">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-[178px] min-w-[275px] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.035]" />
            ))}
          </div>
        ) : topIdeas.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-400 sm:px-5">
            No verified market candidates are available for this slate yet. ResearchBets will not invent a board.
          </div>
        ) : (
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-4 [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-5 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
            {topIdeas.map((idea, index) => {
              const added = slipIds.has(idea.id);
              return (
                <article
                  key={idea.id}
                  className="min-w-[278px] snap-start rounded-2xl border border-white/[0.08] bg-black/20 p-4 transition hover:border-white/[0.16] sm:min-w-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">#{index + 1} research lead</span>
                    <span className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] ${riskTone(idea.structuralRisk)}`}>
                      {idea.structuralRisk} fragility
                    </span>
                  </div>

                  <div className="mt-4">
                    <h3 className="truncate text-[17px] font-semibold tracking-[-0.025em] text-white">{idea.player}</h3>
                    <p className="mt-1 text-[15px] font-medium text-slate-200">{milestone(idea)}</p>
                    <p className="mt-1 truncate text-[11px] text-slate-500">{idea.matchup}</p>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/[0.06] py-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.1em] text-slate-600">Price implied</p>
                      <p className="mt-1 text-[13px] font-semibold text-slate-100">{Math.round(idea.marketImpliedProb * 100)}%</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.1em] text-slate-600">Best price</p>
                      <p className="mt-1 text-[13px] font-semibold text-slate-100">{formatOdds(idea.bestPrice)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.1em] text-slate-600">Books</p>
                      <p className="mt-1 text-[13px] font-semibold text-slate-100">{idea.sourceCount}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-[10px] text-amber-200/70">Status check pending</span>
                    <button
                      type="button"
                      onClick={() => addIdea(idea)}
                      disabled={added}
                      className="rounded-xl border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-white/[0.1] disabled:cursor-default disabled:text-emerald-200"
                    >
                      {added ? 'Added' : 'Add to ticket'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-4 py-3 text-[10px] text-slate-500 sm:px-5">
          <span>Market probability is sportsbook-price implied, not a calibrated ResearchBets prediction.</span>
          <span>Next layer: active/inactive + role + L5/L10 verification.</span>
        </div>
      </div>
    </section>
  );
}
