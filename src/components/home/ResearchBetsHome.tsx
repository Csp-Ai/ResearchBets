'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { NextGameBriefing } from '@/src/components/home/NextGameBriefing';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { fetchTodayIdeasShared } from '@/src/core/ideas/todayIdeasClient';
import type { MarketType } from '@/src/core/markets/marketType';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';

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
  stepDown?: {
    line: number;
    bestPrice: number;
    consensusPrice: number;
    marketImpliedProb: number;
    books: string[];
    sourceCount: number;
  };
  why: string[];
};

type IdeasPayload = {
  mode: 'live-market' | 'unavailable';
  generatedAt: string;
  date: string;
  timeZone: string;
  sport: 'NFL';
  games: number;
  events: Array<{
    eventId: string;
    matchup: string;
    commenceTime: string;
  }>;
  ideas: TodayIdea[];
  warnings: string[];
};

type IdeasResponse = { ok: boolean; data?: IdeasPayload };
type ViewMode = 'balanced' | 'safer' | 'upside';

type Preset = {
  id: ViewMode;
  title: string;
  subtitle: string;
  count: number;
};

const LABELS: Partial<Record<MarketType, string>> = {
  passing_yards: 'pass yards',
  passing_tds: 'pass TDs',
  rushing_yards: 'rush yards',
  receiving_yards: 'receiving yards',
  receptions: 'receptions',
  carries: 'carries',
  anytime_td: 'anytime TD',
};

const PRESETS: Preset[] = [
  { id: 'safer', title: 'Safer 2-leg', subtitle: 'Higher implied hit rates first', count: 2 },
  { id: 'balanced', title: 'Balanced 4-leg', subtitle: 'Best blend of price + structure', count: 4 },
  { id: 'upside', title: 'Upside 3-leg', subtitle: 'More payout without TD overload', count: 3 },
];

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
  .replace('New York Giants', 'NYG')
  .replace('Los Angeles Rams', 'LAR')
  .replace('San Francisco 49ers', 'SF');

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
  if (!iso) return 'Scanning';
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return 'Now';
  }
};

const riskLabel = (risk: TodayIdea['structuralRisk']) => {
  if (risk === 'low') return 'Low fragility';
  if (risk === 'high') return 'Higher variance';
  return 'Balanced';
};

const ideaToLeg = (idea: TodayIdea) => ({
  id: idea.id,
  player: idea.player,
  marketType: idea.marketType,
  line: thresholdLabel(idea),
  odds: formatOdds(idea.bestPrice),
  game: idea.matchup,
  marketImpliedProb: idea.marketImpliedProb,
  consensusPrice: formatOdds(idea.consensusPrice),
  adjacentAlt: idea.stepDown
    ? {
        line: idea.stepDown.line,
        bestPrice: formatOdds(idea.stepDown.bestPrice),
        consensusPrice: formatOdds(idea.stepDown.consensusPrice),
        marketImpliedProb: idea.stepDown.marketImpliedProb,
        sourceCount: idea.stepDown.sourceCount,
      }
    : undefined,
});

function SacredGeometry() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 420 420"
      className="sacred absolute -right-28 -top-20 h-[360px] w-[360px] opacity-[0.055] sm:-right-12 sm:h-[460px] sm:w-[460px]"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <circle cx="210" cy="210" r="112" />
        <circle cx="210" cy="98" r="112" />
        <circle cx="210" cy="322" r="112" />
        <circle cx="113" cy="154" r="112" />
        <circle cx="307" cy="154" r="112" />
        <circle cx="113" cy="266" r="112" />
        <circle cx="307" cy="266" r="112" />
        <path d="M210 45 L353 292 L67 292 Z" />
        <path d="M210 375 L353 128 L67 128 Z" />
      </g>
    </svg>
  );
}

function Signal({ value }: { value: number }) {
  return (
    <div className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.055]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-300"
        style={{ width: `${value}%` }}
      />
      <div className="signal-scan absolute inset-y-[-3px] w-10 rounded-full bg-cyan-100/[0.28] blur-sm" />
    </div>
  );
}

export function ResearchBetsHome() {
  const nervous = useNervousSystem();
  const { slip, addLeg, removeLeg, setSlip } = useDraftSlip();
  const [payload, setPayload] = useState<IdeasPayload>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('balanced');

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setFailed(false);
    fetchTodayIdeasShared<IdeasResponse>({
      sport: 'NFL',
      date: nervous.date,
      tz: nervous.tz,
      signal: controller.signal,
    })
      .then((body) => {
        if (!body.ok || !body.data) throw new Error('ideas_unavailable');
        setPayload(body.data);
      })
      .catch((error) => {
        if ((error as Error).name !== 'AbortError') setFailed(true);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [nervous.date, nervous.tz]);

  const sortedIdeas = useMemo(() => {
    const rows = payload?.ideas ?? [];
    if (viewMode === 'safer') return [...rows].sort((a, b) => b.marketImpliedProb - a.marketImpliedProb);
    if (viewMode === 'upside') return [...rows].sort((a, b) => a.marketImpliedProb - b.marketImpliedProb);
    return rows;
  }, [payload?.ideas, viewMode]);

  const topIdeas = sortedIdeas.slice(0, 3);
  const moreIdeas = sortedIdeas.slice(3, 8);
  const slipIds = useMemo(() => new Set(slip.map((leg) => leg.id)), [slip]);

  const weakestIdea = useMemo(() => {
    const selectedIdeas = sortedIdeas.filter((idea) => slipIds.has(idea.id));
    const source = selectedIdeas.length >= 2 ? selectedIdeas : topIdeas;
    if (!source.length) return undefined;
    return [...source].sort((a, b) => a.marketImpliedProb - b.marketImpliedProb)[0];
  }, [slipIds, sortedIdeas, topIdeas]);

  const toggleIdea = (idea: TodayIdea) => {
    if (slipIds.has(idea.id)) {
      removeLeg(idea.id);
      return;
    }
    addLeg(ideaToLeg(idea));
  };

  const buildPreset = (preset: Preset) => {
    const source = [...(payload?.ideas ?? [])];
    const ordered = preset.id === 'safer'
      ? source.sort((a, b) => b.marketImpliedProb - a.marketImpliedProb)
      : preset.id === 'upside'
        ? source.sort((a, b) => a.marketImpliedProb - b.marketImpliedProb)
        : source;
    const selected = ordered.slice(0, Math.min(preset.count, ordered.length));
    if (selected.length < 2) return;
    setViewMode(preset.id);
    setSlip(selected.map(ideaToLeg));
  };

  const selectedCount = slip.length;
  const games = payload?.games ?? 0;
  const qualified = payload?.ideas.length ?? 0;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#03060a] text-white">
      <style jsx>{`
        .ambient-grid {
          background-image:
            linear-gradient(rgba(255,255,255,.024) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.024) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: linear-gradient(to bottom, rgba(255,255,255,.8), transparent 70%);
        }
        .sacred { animation: sacredSpin 44s linear infinite; }
        .signal-scan { animation: signalScan 2.8s linear infinite; }
        .stress-scan { animation: stressScan 3s ease-in-out infinite; }
        @keyframes sacredSpin { to { transform: rotate(360deg); } }
        @keyframes signalScan { from { left:-20%; } to { left:110%; } }
        @keyframes stressScan { 0%,100% { transform: translateX(-20%); opacity:.25; } 50% { transform: translateX(320%); opacity:.75; } }
        @media (prefers-reduced-motion: reduce) {
          .sacred,.signal-scan,.stress-scan { animation:none !important; }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0">
        <div className="ambient-grid absolute inset-0" />
        <div className="absolute -left-24 -top-24 h-[25rem] w-[25rem] rounded-full bg-cyan-400/[0.07] blur-[150px]" />
        <div className="absolute -right-40 top-[28rem] h-[30rem] w-[30rem] rounded-full bg-indigo-500/[0.07] blur-[170px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-32 pt-4 sm:px-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[14px] border border-cyan-100/[0.12] bg-white/[0.035] text-[13px] font-black shadow-[0_0_30px_rgba(34,211,238,.08)]">R</div>
            <div>
              <div className="text-[14px] font-semibold tracking-[-0.03em]">ResearchBets</div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-slate-600">Decision intelligence</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[10px] text-slate-400 backdrop-blur-xl">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            NFL · {nervous.date}
          </div>
        </header>

        <section className="relative mt-5 overflow-hidden rounded-[32px] border border-white/[0.07] bg-[linear-gradient(145deg,rgba(12,18,29,.9),rgba(5,8,13,.94))] px-5 py-7 shadow-[0_35px_120px_rgba(0,0,0,.45)] sm:px-8 sm:py-10">
          <SacredGeometry />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/[0.28] to-transparent" />

          <div className="relative max-w-4xl">
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-100/65">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,.75)]" />
              Live slate intelligence
            </div>

            <h1 className="mt-4 max-w-3xl text-[42px] font-semibold leading-[0.94] tracking-[-0.062em] sm:text-[64px] lg:text-[76px]">
              I scanned {loading ? 'today’s slate' : `${games} games`}.
              <span className="block bg-gradient-to-r from-white via-cyan-100 to-slate-400 bg-clip-text text-transparent">
                Here are the plays worth your attention.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-slate-400 sm:text-[16px]">
              Live markets in. Junk lines out. ResearchBets finds useful thresholds, shows what supports them, then stress-tests the ticket before you lock it.
            </p>

            <div className="mt-6 flex flex-wrap gap-2 text-[10px] text-slate-500">
              <span className="rounded-full border border-white/[0.07] bg-black/20 px-3 py-2">{games} games scanned</span>
              <span className="rounded-full border border-white/[0.07] bg-black/20 px-3 py-2">{qualified} qualified</span>
              <span className="rounded-full border border-white/[0.07] bg-black/20 px-3 py-2">Updated {formatUpdated(payload?.generatedAt, nervous.tz)}</span>
            </div>
          </div>

          <div className="relative mt-7">
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((item) => <div key={item} className="h-44 animate-pulse rounded-[24px] bg-white/[0.03]" />)}
              </div>
            ) : failed || payload?.mode === 'unavailable' ? (
              <div className="rounded-[24px] border border-amber-200/[0.10] bg-amber-100/[0.025] p-5 text-sm text-slate-400">
                Live scan unavailable. ResearchBets will not manufacture picks when provider data is missing.
              </div>
            ) : qualified === 0 ? (
              <div className="rounded-[26px] border border-white/[0.07] bg-black/20 p-5 sm:p-6">
                <div className="text-[10px] uppercase tracking-[0.17em] text-slate-600">No forced picks</div>
                <div className="mt-2 text-[24px] font-semibold tracking-[-0.04em]">Nothing clears the filter yet.</div>
                <p className="mt-2 max-w-xl text-[13px] leading-6 text-slate-500">
                  ResearchBets scanned {games} games and is holding the line instead of padding the feed with bad parlay legs.
                </p>
                <Link href={nervous.toHref('/cockpit', { sport: 'NFL', mode: 'live' })} className="mt-4 inline-flex rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-[11px] font-semibold text-slate-300">
                  Explore near-misses →
                </Link>
              </div>
            ) : (
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible">
                {topIdeas.map((idea, index) => {
                  const added = slipIds.has(idea.id);
                  const signal = Math.round(idea.marketImpliedProb * 100);
                  return (
                    <article key={idea.id} className={`min-w-[84%] snap-center rounded-[26px] border p-4 backdrop-blur-xl sm:min-w-0 ${added ? 'border-emerald-300/[0.18] bg-emerald-300/[0.045]' : 'border-white/[0.08] bg-black/25'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[10px] text-slate-600">0{index + 1} · TOP IDEA</div>
                        <div className="rounded-full border border-white/[0.07] px-2 py-1 text-[9px] text-slate-400">{riskLabel(idea.structuralRisk)}</div>
                      </div>
                      <h2 className="mt-4 text-[22px] font-semibold tracking-[-0.04em]">{idea.player}</h2>
                      <div className="mt-1 text-[15px] text-slate-200">{thresholdLabel(idea)}</div>
                      <div className="mt-1 text-[10px] text-slate-600">{shortMatchup(idea.matchup)} · {formatTime(idea.commenceTime, nervous.tz)}</div>

                      <div className="mt-5 flex items-end justify-between gap-4">
                        <div>
                          <div className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Market signal</div>
                          <div className="mt-1 text-[28px] font-semibold tracking-[-0.05em]">{signal}%</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Best price</div>
                          <div className="mt-1 text-[18px] font-semibold">{formatOdds(idea.bestPrice)}</div>
                        </div>
                      </div>
                      <div className="mt-3"><Signal value={signal} /></div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="text-[10px] text-slate-600">{idea.sourceCount} books · {idea.readiness === 'market-verified' ? 'verified' : 'status check pending'}</span>
                        <button type="button" onClick={() => toggleIdea(idea)} className={`rounded-xl px-3 py-2 text-[11px] font-semibold ${added ? 'bg-emerald-300/[0.10] text-emerald-100' : 'bg-white text-[#081018]'}`}>
                          {added ? 'Added ✓' : 'Add'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <div className="mt-4">
          <NextGameBriefing
            events={payload?.events ?? []}
            ideas={payload?.ideas ?? []}
            loading={loading}
            unavailable={failed || payload?.mode === 'unavailable'}
          />
        </div>

        <section className="py-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-600">One tap</div>
              <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.05em]">Build me a ticket.</h2>
            </div>
            <div className="hidden text-[11px] text-slate-600 sm:block">ResearchBets assembles → you stress-test</div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => buildPreset(preset)}
                disabled={qualified < 2}
                className={`rounded-[22px] border p-4 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35 ${viewMode === preset.id ? 'border-cyan-200/[0.16] bg-cyan-300/[0.055]' : 'border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.04]'}`}
              >
                <div className="text-[15px] font-semibold text-slate-100">{preset.title}</div>
                <div className="mt-1 text-[11px] text-slate-600">{preset.subtitle}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[30px] border border-white/[0.07] bg-[linear-gradient(155deg,rgba(11,17,27,.82),rgba(4,7,12,.92))] p-5 sm:p-7">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-100/[0.18] to-transparent" />
          <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[.85fr_1.15fr] lg:items-center">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-600">The ResearchBets difference</div>
              <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.05em]">Find the leg that kills the ticket.</h2>
              <p className="mt-3 max-w-lg text-[13px] leading-6 text-slate-500">
                Picks are easy to generate. ResearchBets is built to expose correlation, fragile thresholds, and the weakest link before you submit.
              </p>
              <Link href={nervous.toHref('/stress-test')} className="mt-5 inline-flex rounded-xl bg-white px-4 py-3 text-[11px] font-bold text-[#081018]">Open stress test →</Link>
            </div>

            <div className="relative rounded-[24px] border border-white/[0.07] bg-black/25 p-4">
              <div className="stress-scan pointer-events-none absolute left-0 top-0 h-full w-1/4 bg-gradient-to-r from-transparent via-cyan-200/[0.055] to-transparent" />
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.15em] text-slate-600">Live ticket diagnostic</div>
                <div className="rounded-full border border-white/[0.07] px-2 py-1 text-[9px] text-slate-500">Before lock</div>
              </div>

              <div className="mt-4 grid gap-2">
                {topIdeas.map((idea) => {
                  const weak = weakestIdea?.id === idea.id;
                  return (
                    <div key={idea.id} className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 ${weak ? 'border-amber-300/[0.18] bg-amber-300/[0.045]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-semibold text-slate-200">{idea.player}</div>
                        <div className="truncate text-[10px] text-slate-600">{thresholdLabel(idea)}</div>
                      </div>
                      <div className={`shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em] ${weak ? 'text-amber-200' : 'text-emerald-200/70'}`}>
                        {weak ? 'weakest' : 'holds'}
                      </div>
                    </div>
                  );
                })}
                {!topIdeas.length ? <div className="py-8 text-center text-[12px] text-slate-600">Ticket diagnostics appear when ideas qualify.</div> : null}
              </div>

              {weakestIdea ? (
                <div className="mt-3 rounded-2xl border border-amber-300/[0.11] bg-amber-300/[0.035] px-4 py-3">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-amber-100/55">Primary pressure point</div>
                  <div className="mt-1 text-[13px] font-semibold text-slate-200">{weakestIdea.player} · {thresholdLabel(weakestIdea)}</div>
                  <div className="mt-1 text-[10px] leading-5 text-slate-500">Lowest current market-implied support among the displayed structure. Full fragility analysis runs in Stress Test.</div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {moreIdeas.length > 0 ? (
          <section className="py-8">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-semibold tracking-[-0.035em]">More qualified ideas</h2>
              <Link href={nervous.toHref('/cockpit', { sport: 'NFL', mode: 'live' })} className="text-[10px] text-slate-500">Full board →</Link>
            </div>
            <div className="mt-3 overflow-hidden rounded-[22px] border border-white/[0.07] bg-white/[0.018]">
              {moreIdeas.map((idea) => {
                const added = slipIds.has(idea.id);
                return (
                  <button key={idea.id} type="button" onClick={() => toggleIdea(idea)} className="flex w-full items-center justify-between gap-3 border-b border-white/[0.055] px-4 py-4 text-left last:border-b-0 hover:bg-white/[0.025]">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold text-slate-200">{idea.player} · {thresholdLabel(idea)}</div>
                      <div className="mt-1 text-[10px] text-slate-600">{shortMatchup(idea.matchup)} · {idea.sourceCount} books</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[12px] font-semibold">{Math.round(idea.marketImpliedProb * 100)}%</div>
                        <div className="text-[9px] text-slate-600">signal</div>
                      </div>
                      <div className={`grid h-8 w-8 place-items-center rounded-full border text-[14px] ${added ? 'border-emerald-300/[0.18] bg-emerald-300/[0.10] text-emerald-100' : 'border-white/[0.08] bg-white/[0.035] text-slate-300'}`}>{added ? '✓' : '+'}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#05080d]/[0.90] px-3 py-3 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-100">{selectedCount ? `${selectedCount} legs selected` : 'Build a ticket in one tap'}</div>
            <div className="mt-0.5 truncate text-[9px] text-slate-600">{selectedCount >= 2 ? 'Ready for weakest-leg + correlation analysis.' : 'Choose a preset or add individual ideas.'}</div>
          </div>
          {selectedCount >= 2 ? (
            <Link href={nervous.toHref('/stress-test')} className="shrink-0 rounded-xl bg-white px-4 py-3 text-[11px] font-bold text-[#081018]">Stress-test</Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                const balanced = PRESETS.find((preset) => preset.id === 'balanced');
                if (balanced) buildPreset(balanced);
              }}
              disabled={qualified < 2}
              className="shrink-0 rounded-xl bg-white px-4 py-3 text-[11px] font-bold text-[#081018] disabled:opacity-35"
            >
              Build balanced
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
