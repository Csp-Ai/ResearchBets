'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

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

type IdeasPayload = {
  mode: 'live-market' | 'unavailable';
  generatedAt: string;
  date: string;
  timeZone: string;
  sport: 'NFL';
  games: number;
  ideas: TodayIdea[];
  warnings: string[];
};

type IdeasResponse = { ok: boolean; data?: IdeasPayload };

type ViewMode = 'balanced' | 'safer' | 'upside';

const LABELS: Partial<Record<MarketType, string>> = {
  passing_yards: 'pass yards',
  passing_tds: 'pass TDs',
  rushing_yards: 'rush yards',
  receiving_yards: 'receiving yards',
  receptions: 'receptions',
  carries: 'carries',
  anytime_td: 'anytime TD',
};

const formatOdds = (odds: number) => (odds > 0 ? `+${odds}` : String(odds));

const thresholdLabel = (idea: TodayIdea) => {
  if (idea.marketType === 'anytime_td') return 'Anytime TD';
  const threshold = Number.isInteger(idea.line)
    ? idea.line
    : Math.abs(idea.line % 1) === 0.5
      ? Math.floor(idea.line) + 1
      : idea.line;
  return `${threshold}+ ${LABELS[idea.marketType] ?? idea.marketType}`;
};

const shortMatchup = (matchup: string) => matchup
  .replace('Green Bay Packers', 'GB')
  .replace('Minnesota Vikings', 'MIN')
  .replace('Washington Commanders', 'WAS')
  .replace('Philadelphia Eagles', 'PHI')
  .replace('Arizona Cardinals', 'ARI')
  .replace('Los Angeles Chargers', 'LAC')
  .replace('Miami Dolphins', 'MIA')
  .replace('Las Vegas Raiders', 'LV');

const formatTime = (iso: string, tz: string) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return 'Today';
  }
};

const riskCopy = (risk: TodayIdea['structuralRisk']) => {
  if (risk === 'low') return 'Lower fragility';
  if (risk === 'high') return 'Higher variance';
  return 'Balanced';
};

const riskDot = (risk: TodayIdea['structuralRisk']) => {
  if (risk === 'low') return 'bg-emerald-300';
  if (risk === 'high') return 'bg-amber-300';
  return 'bg-sky-300';
};

export function ResearchBetsHome() {
  const nervous = useNervousSystem();
  const { slip, addLeg, removeLeg } = useDraftSlip();
  const [payload, setPayload] = useState<IdeasPayload>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('balanced');

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
  const ideas = useMemo(() => {
    const rows = payload?.ideas ?? [];
    if (viewMode === 'safer') {
      return [...rows].sort((a, b) => b.marketImpliedProb - a.marketImpliedProb).slice(0, 6);
    }
    if (viewMode === 'upside') {
      return [...rows].sort((a, b) => a.marketImpliedProb - b.marketImpliedProb).slice(0, 6);
    }
    return rows.slice(0, 6);
  }, [payload?.ideas, viewMode]);

  const summary = useMemo(() => {
    const rows = payload?.ideas ?? [];
    if (!rows.length) return 'Waiting for enough live market data to form a useful slate.';
    const low = rows.filter((idea) => idea.structuralRisk === 'low').length;
    const medium = rows.filter((idea) => idea.structuralRisk === 'medium').length;
    return `${rows.length} useful thresholds cleared the price filter across ${payload?.games ?? 0} games. ${low} lower-fragility and ${medium} balanced candidates lead the board.`;
  }, [payload]);

  const toggleIdea = (idea: TodayIdea) => {
    if (slipIds.has(idea.id)) {
      removeLeg(idea.id);
      return;
    }

    addLeg({
      id: idea.id,
      player: idea.player,
      marketType: idea.marketType,
      line: thresholdLabel(idea),
      odds: formatOdds(idea.bestPrice),
      game: idea.matchup,
    });
  };

  const selectedIdeas = ideas.filter((idea) => slipIds.has(idea.id));

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <div className="mx-auto max-w-6xl px-4 pb-32 pt-4 sm:px-6 sm:pt-6">
        <header className="flex items-center justify-between border-b border-white/[0.07] pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.1] bg-[radial-gradient(circle_at_30%_20%,rgba(110,231,255,.32),transparent_45%),linear-gradient(145deg,#111827,#071019)] text-sm font-black tracking-[-0.05em] shadow-[0_0_28px_rgba(45,212,191,.12)]">R</div>
            <div>
              <div className="text-[14px] font-semibold tracking-[-0.02em]">ResearchBets</div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Decision intelligence</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-[10px] text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.7)]" />
            NFL · {nervous.date}
          </div>
        </header>

        <section className="relative overflow-hidden border-b border-white/[0.07] py-10 sm:py-14">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/[0.05] blur-3xl" />
          <div className="relative max-w-3xl">
            <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
              <span className="h-px w-7 bg-cyan-200/50" />
              Live slate intelligence
            </div>
            <h1 className="text-[42px] font-semibold leading-[0.96] tracking-[-0.055em] sm:text-[64px]">
              Your slate,<br />researched.
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-6 text-slate-400 sm:text-[16px]">
              ResearchBets scans today&apos;s markets, filters out junk alt lines, and surfaces useful parlay structures before you build the ticket.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
              <div className="text-[24px] font-semibold tracking-[-0.04em]">{loading ? '—' : payload?.games ?? 0}</div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-slate-600">Games scanned</div>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
              <div className="text-[24px] font-semibold tracking-[-0.04em]">{loading ? '—' : payload?.ideas.length ?? 0}</div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-slate-600">Useful ideas</div>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
              <div className="text-[24px] font-semibold tracking-[-0.04em]">{slip.length}</div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-slate-600">In ticket</div>
            </div>
          </div>
        </section>

        <section className="py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">AI research briefing</div>
              <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.04em]">What made the cut</h2>
              <p className="mt-2 max-w-2xl text-[13px] leading-5 text-slate-500">{summary}</p>
            </div>
            <div className="inline-flex w-fit rounded-xl border border-white/[0.07] bg-white/[0.02] p-1">
              {([
                ['balanced', 'Balanced'],
                ['safer', 'Safer'],
                ['upside', 'More upside'],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`rounded-lg px-3 py-2 text-[10px] font-semibold transition ${viewMode === mode ? 'bg-white/[0.09] text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="h-52 animate-pulse rounded-[22px] border border-white/[0.06] bg-white/[0.025]" />
              ))}
            </div>
          ) : failed || payload?.mode === 'unavailable' ? (
            <div className="mt-5 rounded-[22px] border border-amber-200/[0.1] bg-amber-100/[0.03] p-5 text-sm text-slate-400">
              Live market scan is unavailable. ResearchBets won&apos;t manufacture a slate when provider data is missing.
            </div>
          ) : ideas.length === 0 ? (
            <div className="mt-5 rounded-[22px] border border-white/[0.07] bg-white/[0.02] p-5 text-sm text-slate-400">
              No useful parlay thresholds cleared the current filters. That is a valid result — not every slate needs a forced recommendation.
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ideas.map((idea, index) => {
                const added = slipIds.has(idea.id);
                return (
                  <article
                    key={idea.id}
                    className={`group relative overflow-hidden rounded-[22px] border p-4 transition duration-300 ${added ? 'border-emerald-300/25 bg-emerald-300/[0.035]' : 'border-white/[0.07] bg-[linear-gradient(160deg,rgba(255,255,255,.035),rgba(255,255,255,.012))] hover:-translate-y-0.5 hover:border-white/[0.13]'}`}
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.13] to-transparent" />
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">Lead {String(index + 1).padStart(2, '0')}</div>
                      <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-500">
                        <span className={`h-1.5 w-1.5 rounded-full ${riskDot(idea.structuralRisk)}`} />
                        {riskCopy(idea.structuralRisk)}
                      </div>
                    </div>

                    <div className="mt-5">
                      <h3 className="text-[19px] font-semibold tracking-[-0.03em]">{idea.player}</h3>
                      <div className="mt-1 text-[15px] font-medium text-slate-200">{thresholdLabel(idea)}</div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-600">
                        <span>{shortMatchup(idea.matchup)}</span>
                        <span>·</span>
                        <span>{formatTime(idea.commenceTime, nervous.tz)}</span>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2 border-y border-white/[0.06] py-3">
                      <div>
                        <div className="text-[8px] uppercase tracking-[0.11em] text-slate-600">Market</div>
                        <div className="mt-1 text-[13px] font-semibold">{Math.round(idea.marketImpliedProb * 100)}%</div>
                      </div>
                      <div>
                        <div className="text-[8px] uppercase tracking-[0.11em] text-slate-600">Best price</div>
                        <div className="mt-1 text-[13px] font-semibold">{formatOdds(idea.bestPrice)}</div>
                      </div>
                      <div>
                        <div className="text-[8px] uppercase tracking-[0.11em] text-slate-600">Books</div>
                        <div className="mt-1 text-[13px] font-semibold">{idea.sourceCount}</div>
                      </div>
                    </div>

                    <div className="mt-4 min-h-10 text-[10px] leading-4 text-slate-500">
                      {idea.why[2] ?? idea.why[0]}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="text-[9px] text-amber-200/60">Status verification pending</div>
                      <button
                        type="button"
                        onClick={() => toggleIdea(idea)}
                        className={`rounded-xl px-3 py-2 text-[10px] font-semibold transition ${added ? 'border border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100' : 'border border-white/[0.09] bg-white/[0.045] text-slate-200 hover:bg-white/[0.08]'}`}
                      >
                        {added ? 'Remove' : 'Add'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="border-t border-white/[0.07] py-7">
          <div className="flex flex-col gap-4 rounded-[22px] border border-white/[0.07] bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Next layer</div>
              <div className="mt-1 text-[18px] font-semibold tracking-[-0.03em]">Go deeper only when you need to.</div>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">Explore every market, paste an existing slip, or review the full research board.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/today" className="rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 py-2.5 text-[11px] font-semibold text-slate-200">Explore markets</Link>
              <Link href="/ingest" className="rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 py-2.5 text-[11px] font-semibold text-slate-200">Paste slip</Link>
            </div>
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#070a0f]/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold">{slip.length === 0 ? 'Build a smarter ticket' : `${slip.length} ${slip.length === 1 ? 'leg' : 'legs'} selected`}</div>
            <div className="mt-0.5 truncate text-[9px] text-slate-600">
              {slip.length === 0 ? 'Add research leads, then stress-test the structure.' : selectedIdeas.map((idea) => idea.player).join(' · ') || 'Draft ticket ready for analysis.'}
            </div>
          </div>
          <Link
            href={slip.length >= 2 ? '/stress-test' : '#'}
            aria-disabled={slip.length < 2}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-[11px] font-semibold ${slip.length >= 2 ? 'bg-[#e7fbf7] text-[#07110f]' : 'cursor-not-allowed border border-white/[0.08] bg-white/[0.035] text-slate-600'}`}
          >
            {slip.length >= 2 ? 'Stress-test ticket' : 'Select 2+ legs'}
          </Link>
        </div>
      </div>
    </main>
  );
}
