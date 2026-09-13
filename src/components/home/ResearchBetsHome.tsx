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
  .replace('Las Vegas Raiders', 'LV')
  .replace('Dallas Cowboys', 'DAL')
  .replace('New York Giants', 'NYG');

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

const formatUpdated = (iso: string | undefined, tz: string) => {
  if (!iso) return 'Scanning now';
  try {
    return `Updated ${new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso))}`;
  } catch {
    return 'Updated now';
  }
};

const riskCopy = (risk: TodayIdea['structuralRisk']) => {
  if (risk === 'low') return 'Lower fragility';
  if (risk === 'high') return 'Higher variance';
  return 'Balanced';
};

const riskTone = (risk: TodayIdea['structuralRisk']) => {
  if (risk === 'low') return 'text-emerald-200 bg-emerald-300/[0.08] border-emerald-300/[0.16]';
  if (risk === 'high') return 'text-amber-200 bg-amber-300/[0.08] border-amber-300/[0.16]';
  return 'text-sky-200 bg-sky-300/[0.08] border-sky-300/[0.16]';
};

const ideaToLeg = (idea: TodayIdea) => ({
  id: idea.id,
  player: idea.player,
  marketType: idea.marketType,
  line: thresholdLabel(idea),
  odds: formatOdds(idea.bestPrice),
  game: idea.matchup,
});

export function ResearchBetsHome() {
  const nervous = useNervousSystem();
  const { slip, addLeg, removeLeg, setSlip } = useDraftSlip();
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

  const primaryIdeas = ideas.slice(0, 3);
  const secondaryIdeas = ideas.slice(3, 6);

  const summary = useMemo(() => {
    const rows = payload?.ideas ?? [];
    if (!rows.length) return 'Waiting for enough live market data to form a useful slate.';
    const low = rows.filter((idea) => idea.structuralRisk === 'low').length;
    const avg = rows.reduce((sum, idea) => sum + idea.marketImpliedProb, 0) / rows.length;
    return `${rows.length} useful thresholds cleared the filter across ${payload?.games ?? 0} games. ${low} are lower-fragility structures; the slate averages ${Math.round(avg * 100)}% sportsbook-implied probability.`;
  }, [payload]);

  const toggleIdea = (idea: TodayIdea) => {
    if (slipIds.has(idea.id)) {
      removeLeg(idea.id);
      return;
    }
    addLeg(ideaToLeg(idea));
  };

  const buildBalancedTicket = () => {
    const candidates = ideas.slice(0, Math.min(4, ideas.length));
    if (candidates.length < 2) return;
    setSlip(candidates.map(ideaToLeg));
  };

  const selectedCount = slip.length;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#05070b] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-80">
        <div className="absolute -left-28 -top-20 h-72 w-72 rounded-full bg-cyan-400/[0.07] blur-[110px]" />
        <div className="absolute right-[-8rem] top-[18rem] h-80 w-80 rounded-full bg-indigo-500/[0.07] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-32 pt-4 sm:px-6 sm:pt-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-[13px] border border-cyan-200/[0.14] bg-[#0a111a] text-[13px] font-black shadow-[0_0_35px_rgba(34,211,238,.1)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(103,232,249,.24),transparent_48%)]" />
              <span className="relative">R</span>
            </div>
            <div>
              <div className="text-[14px] font-semibold tracking-[-0.025em]">ResearchBets</div>
              <div className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.16em] text-slate-600">Decision intelligence</div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-white/[0.035] px-3 py-2 text-[10px] text-slate-400 ring-1 ring-white/[0.07]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            Live · NFL
          </div>
        </header>

        <section className="relative mt-5 overflow-hidden rounded-[30px] border border-white/[0.07] bg-[linear-gradient(145deg,rgba(13,20,31,.92),rgba(6,9,15,.92))] px-5 py-6 shadow-[0_28px_90px_rgba(0,0,0,.35)] sm:px-7 sm:py-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(34,211,238,.11),transparent_30%),radial-gradient(circle_at_90%_10%,rgba(99,102,241,.09),transparent_26%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/30 to-transparent" />

          <div className="relative grid gap-7 lg:grid-cols-[1.3fr_.7fr] lg:items-end">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/65">
                <span className="h-px w-6 bg-cyan-100/50" />
                AI slate briefing
              </div>
              <h1 className="mt-4 max-w-2xl text-[44px] font-semibold leading-[0.94] tracking-[-0.058em] sm:text-[68px]">
                Today&apos;s board,
                <span className="block bg-gradient-to-r from-white via-cyan-100 to-slate-400 bg-clip-text text-transparent">already researched.</span>
              </h1>
              <p className="mt-5 max-w-xl text-[14px] leading-6 text-slate-400 sm:text-[15px]">
                ResearchBets scans the live slate, rejects useless alt lines, and ranks parlay-ready thresholds before you build anything.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={buildBalancedTicket}
                  disabled={ideas.length < 2}
                  className="rounded-xl bg-white px-4 py-3 text-[12px] font-semibold text-[#070a0f] shadow-[0_10px_35px_rgba(255,255,255,.08)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Build balanced {Math.min(4, ideas.length) || 4}-leg
                </button>
                <Link
                  href={nervous.toHref('/ingest')}
                  className="rounded-xl bg-white/[0.045] px-4 py-3 text-[12px] font-semibold text-slate-200 ring-1 ring-white/[0.09] transition hover:bg-white/[0.07]"
                >
                  Paste a slip
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
              {[
                ['Games', loading ? '—' : String(payload?.games ?? 0)],
                ['Qualified', loading ? '—' : String(payload?.ideas.length ?? 0)],
                ['Selected', String(selectedCount)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-black/20 px-3 py-3 ring-1 ring-white/[0.06] lg:flex lg:items-center lg:justify-between lg:px-4">
                  <div className="text-[9px] uppercase tracking-[0.12em] text-slate-600">{label}</div>
                  <div className="mt-1 text-[22px] font-semibold tracking-[-0.04em] lg:mt-0 lg:text-[18px]">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-7 sm:py-9">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span className="rounded-full bg-emerald-300/[0.08] px-2 py-1 text-emerald-200/80 ring-1 ring-emerald-300/[0.12]">LIVE RESEARCH</span>
                <span>{formatUpdated(payload?.generatedAt, nervous.tz)}</span>
              </div>
              <h2 className="mt-3 text-[27px] font-semibold tracking-[-0.045em] sm:text-[32px]">ResearchBets brief</h2>
              <p className="mt-2 max-w-2xl text-[13px] leading-5 text-slate-500">{summary}</p>
            </div>

            <div className="inline-flex w-fit rounded-xl bg-white/[0.025] p-1 ring-1 ring-white/[0.07]">
              {([
                ['balanced', 'Balanced'],
                ['safer', 'Safer'],
                ['upside', 'More upside'],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`rounded-lg px-3 py-2 text-[10px] font-semibold transition ${viewMode === mode ? 'bg-white/[0.1] text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-56 animate-pulse rounded-[24px] bg-white/[0.025] ring-1 ring-white/[0.06]" />
              ))}
            </div>
          ) : failed || payload?.mode === 'unavailable' ? (
            <div className="mt-5 rounded-[24px] bg-amber-100/[0.025] p-5 text-sm text-slate-400 ring-1 ring-amber-200/[0.1]">
              Live market scan is unavailable. ResearchBets won&apos;t manufacture a slate when provider data is missing.
            </div>
          ) : ideas.length === 0 ? (
            <div className="mt-5 rounded-[24px] bg-white/[0.02] p-5 text-sm text-slate-400 ring-1 ring-white/[0.07]">
              Nothing useful cleared the current filters. That is a valid result — ResearchBets will not force a recommendation.
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                {primaryIdeas.map((idea, index) => {
                  const added = slipIds.has(idea.id);
                  const probability = Math.round(idea.marketImpliedProb * 100);

                  return (
                    <article
                      key={idea.id}
                      className={`relative overflow-hidden rounded-[24px] p-5 transition duration-300 ${added ? 'bg-emerald-300/[0.045] ring-1 ring-emerald-300/[0.22]' : 'bg-[linear-gradient(160deg,rgba(255,255,255,.045),rgba(255,255,255,.015))] ring-1 ring-white/[0.07] hover:-translate-y-0.5 hover:ring-white/[0.14]'}`}
                    >
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-white/[0.05] text-[10px] font-semibold text-slate-400 ring-1 ring-white/[0.07]">{index + 1}</span>
                          <span className="text-[10px] font-medium text-slate-500">Priority lead</span>
                        </div>
                        <span className={`rounded-full border px-2 py-1 text-[9px] font-medium ${riskTone(idea.structuralRisk)}`}>
                          {riskCopy(idea.structuralRisk)}
                        </span>
                      </div>

                      <div className="mt-5">
                        <h3 className="text-[20px] font-semibold tracking-[-0.035em]">{idea.player}</h3>
                        <p className="mt-1 text-[16px] font-medium text-slate-200">{thresholdLabel(idea)}</p>
                        <p className="mt-1 text-[11px] text-slate-600">{shortMatchup(idea.matchup)} · {formatTime(idea.commenceTime, nervous.tz)}</p>
                      </div>

                      <div className="mt-5 rounded-2xl bg-black/20 p-3.5 ring-1 ring-white/[0.055]">
                        <div className="flex items-end justify-between">
                          <div>
                            <div className="text-[9px] uppercase tracking-[0.11em] text-slate-600">Market signal</div>
                            <div className="mt-1 text-[25px] font-semibold tracking-[-0.045em]">{probability}%</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] uppercase tracking-[0.11em] text-slate-600">Best price</div>
                            <div className="mt-1 text-[14px] font-semibold text-slate-200">{formatOdds(idea.bestPrice)}</div>
                          </div>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.055]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-300/70 via-sky-300/80 to-indigo-300/70 shadow-[0_0_15px_rgba(103,232,249,.22)]"
                            style={{ width: `${probability}%` }}
                          />
                        </div>
                        <div className="mt-2 flex justify-between text-[9px] text-slate-600">
                          <span>{idea.sourceCount} books agree on threshold</span>
                          <span>Price-implied</span>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-[10px] text-amber-100/55">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-300/60" />
                          Status check pending
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleIdea(idea)}
                          className={`rounded-xl px-3.5 py-2.5 text-[11px] font-semibold transition ${added ? 'bg-emerald-300/[0.1] text-emerald-100 ring-1 ring-emerald-300/[0.2]' : 'bg-white text-[#080b10] hover:bg-slate-100'}`}
                        >
                          {added ? 'Added ✓' : 'Add leg'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {secondaryIdeas.length > 0 ? (
                <div className="mt-7">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-slate-300">More qualified ideas</h3>
                    <span className="text-[10px] text-slate-600">Tap to add</span>
                  </div>
                  <div className="overflow-hidden rounded-[22px] bg-white/[0.018] ring-1 ring-white/[0.065]">
                    {secondaryIdeas.map((idea, index) => {
                      const added = slipIds.has(idea.id);
                      const probability = Math.round(idea.marketImpliedProb * 100);
                      return (
                        <button
                          key={idea.id}
                          type="button"
                          onClick={() => toggleIdea(idea)}
                          className="grid w-full grid-cols-[1fr_auto] items-center gap-3 border-b border-white/[0.055] px-4 py-4 text-left transition last:border-b-0 hover:bg-white/[0.025]"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-600">0{index + 4}</span>
                              <span className="truncate text-[14px] font-semibold text-slate-200">{idea.player}</span>
                              <span className="truncate text-[12px] text-slate-500">{thresholdLabel(idea)}</span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-600">{shortMatchup(idea.matchup)} · {idea.sourceCount} books · {riskCopy(idea.structuralRisk)}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-[13px] font-semibold text-slate-200">{probability}%</div>
                              <div className="text-[9px] text-slate-600">market</div>
                            </div>
                            <div className={`grid h-8 w-8 place-items-center rounded-full text-[14px] ${added ? 'bg-emerald-300/[0.1] text-emerald-200' : 'bg-white/[0.05] text-slate-300 ring-1 ring-white/[0.07]'}`}>
                              {added ? '✓' : '+'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/[0.018] px-4 py-3 text-[10px] text-slate-600 ring-1 ring-white/[0.055]">
                <span>Market signal = sportsbook-price implied probability, not a ResearchBets win prediction.</span>
                <span>Player-status verification is the next data layer.</span>
              </div>
            </>
          )}
        </section>

        <section className="border-t border-white/[0.06] py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Need the full board?</div>
              <div className="mt-1 text-[15px] font-medium text-slate-300">Open the research cockpit when you want every market and deeper diagnostics.</div>
            </div>
            <Link href={nervous.toHref('/cockpit', { sport: 'NFL', mode: 'live' })} className="w-fit rounded-xl bg-white/[0.045] px-4 py-3 text-[11px] font-semibold text-slate-300 ring-1 ring-white/[0.075] hover:bg-white/[0.07]">
              Explore all markets →
            </Link>
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#070a0f]/90 px-3 py-3 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-200">{selectedCount ? `${selectedCount} leg${selectedCount === 1 ? '' : 's'} selected` : 'Build your ticket'}</div>
            <div className="mt-0.5 truncate text-[9px] text-slate-600">{selectedCount >= 2 ? 'Ready for weakest-leg and correlation analysis.' : 'Pick 2+ ideas or let ResearchBets build a balanced ticket.'}</div>
          </div>
          {selectedCount >= 2 ? (
            <Link href={nervous.toHref('/stress-test')} className="shrink-0 rounded-xl bg-gradient-to-r from-cyan-100 to-white px-4 py-3 text-[11px] font-bold text-[#071015] shadow-[0_0_28px_rgba(103,232,249,.08)]">
              Stress-test ticket
            </Link>
          ) : (
            <button
              type="button"
              onClick={buildBalancedTicket}
              disabled={ideas.length < 2}
              className="shrink-0 rounded-xl bg-white px-4 py-3 text-[11px] font-bold text-[#071015] disabled:opacity-40"
            >
              Build for me
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
